from email.mime import text
from flask import Flask, request, jsonify
from flask_cors import CORS
from db_config import get_db_connection, init_db
from nlp_service import analyze_readability
import os
import time
from werkzeug.utils import secure_filename
from simplify_service import extract_legal_terms, simplify_text, summarize_text

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "Backend is running 🚀"}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    admin_code = data.get("admin_code")
    
    if not name or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500

    try:
        cursor = conn.cursor()

        role = "user"

        # secret admin code
        if admin_code == "CLAUSEEASE_ADMIN_2026":
            role = "admin"

        cursor.execute(
        "INSERT INTO users (name, email, password, role) VALUES (%s,%s,%s,%s)",
        (name, email, password, role)
    )
        conn.commit()
        return jsonify({"message": "Registered successfully ✅"}), 201
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s AND password = %s", (email, password))
        user = cursor.fetchone()
        
        if user:
            return jsonify({"message": "Login successful ✅", "user": {"name": user['name'], "email": user['email'], "role": user['role']}}), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/analyze', methods=['POST'])
def analyze():
    text = ""
    file_saved = False
    saved_path = None
    
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename:
            filename = secure_filename(file.name if hasattr(file, 'name') else file.filename)
        
            timestamp = int(time.time())
            unique_filename = f"{timestamp}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            
        
            file_content = file.read()
            with open(filepath, 'wb') as f:
                f.write(file_content)
            
            file_saved = True
            saved_path = filepath
            
            if file.filename.lower().endswith('.pdf'):
                from PyPDF2 import PdfReader
                import io

                pdf_stream = io.BytesIO(file_content)
                reader = PdfReader(pdf_stream)

                extracted_text = ""
                
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
                        
                text = extracted_text.strip()
            else:
                text = file_content.decode('utf-8', errors='ignore')

    else:
        data = request.json
        text = data.get('text', '')
    
    if not text:
        return jsonify({"message": "No text provided or file is empty"}), 400
    
    results = analyze_readability(text)
    
    # Save to history if user info is provided
    try:
        user_email = request.headers.get('X-User-Email')
        if user_email:
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
                user = cursor.fetchone()
                if user:
                    text_preview = text[:200] + "..." if len(text) > 200 else text
                    cursor.execute("""
                        INSERT INTO analysis_history (user_id, text_preview, flesch_score, fog_score)
                        VALUES (%s, %s, %s, %s)
                    """, 
                    (user['id'], text_preview,
                    results['readability']['flesch_reading_ease'],
                    results['readability']['gunning_fog'])
                    )
                    conn.commit()
                cursor.close()
                conn.close()
    except Exception as e:
        print(f"Error saving history: {e}")

    results["original_text"] = text
    results["file_saved"] = file_saved
    if file_saved:
        results["saved_filename"] = os.path.basename(saved_path)
        
    return jsonify(results), 200

@app.route('/api/my-reports', methods=['GET'])
def get_my_reports():
    user_email = request.headers.get("X-User-Email")

    if not user_email:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Get user
        cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        # Get all reports for this user
        cursor.execute("""
            SELECT id, filename, created_at
            FROM reports
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user['id'],))

        reports = cursor.fetchall()

        return jsonify(reports), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/api/history', methods=['GET'])
def get_history():
    user_email = request.args.get('email')
    if not user_email:
        return jsonify({"message": "Email is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT h.* FROM analysis_history h
            JOIN users u ON h.user_id = u.id
            WHERE u.email = %s
            ORDER BY h.created_at DESC
        """, (user_email,))
        history = cursor.fetchall()
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

from flask import send_file

@app.route('/api/export-pdf', methods=['POST'])
def export_pdf():
    data = request.json
    original_text = data.get('text', '')
    simplified_text = data.get('simplified', '')
    summary_text = data.get('summary', '')
    flesch = data.get('flesch', 'N/A')
    fog = data.get('fog', 'N/A')
    user_email = request.headers.get("X-User-Email")

    if not original_text or not user_email:
        return jsonify({"message": "Text and user required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get user
    cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)

        pdf.cell(0, 10, "ClauseEase Analysis Report", ln=True)
        pdf.ln(5)
        pdf.cell(0, 8, f"Flesch: {flesch}", ln=True)
        pdf.cell(0, 8, f"Fog: {fog}", ln=True)

        pdf.ln(5)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Original Text:", ln=True)
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(0, 7, original_text[:2000].encode("latin-1", "ignore").decode("latin-1"))
        
        pdf.ln(5)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Simplified Version:", ln=True)
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(0, 7, simplified_text[:2000].encode("latin-1", "ignore").decode("latin-1"))
        
        pdf.ln(5)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Smart Summary:", ln=True)
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(0, 7, summary_text[:1000].encode("latin-1", "ignore").decode("latin-1"))

        filename = f"report_{user['id']}_{int(time.time())}.pdf"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        pdf.output(filepath)

        # Save in DB
        cursor.execute(
            "INSERT INTO reports (user_id, filename) VALUES (%s, %s)",
            (user['id'], filename)
        )
        conn.commit()

        report_id = cursor.lastrowid

        return jsonify({
            "message": "PDF saved",
            "report_id": report_id
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/api/download-report/<int:report_id>', methods=['GET'])
def download_report(report_id):
    user_email = request.headers.get("X-User-Email")

    if not user_email:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"message": "User not found"}), 404

    cursor.execute(
        "SELECT * FROM reports WHERE id = %s AND user_id = %s",
        (report_id, user['id'])
    )

    report = cursor.fetchone()

    if not report:
        return jsonify({"message": "Access denied"}), 403

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], report['filename'])

    return send_file(filepath, as_attachment=True)

@app.route('/api/simplify', methods=['POST'])
def simplify():
    text = ""

    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename:
            file_content = file.read()

            if file.filename.lower().endswith('.pdf'):
                from PyPDF2 import PdfReader
                import io

                pdf_stream = io.BytesIO(file_content)
                reader = PdfReader(pdf_stream)

                extracted_text = ""

                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"

                text = extracted_text.strip()

            else:
                text = file_content.decode('utf-8', errors='ignore')

        level = request.form.get("level", "basic")

    else:
        data = request.get_json() or {}
        text = data.get("text", "")
        level = data.get("level", "basic")
        
    if not text:
        return jsonify({"message": "No text provided"}), 400
    
    if level == "basic":
        prompt = "Simplify the following legal contract slightly:\n" + text

    elif level == "intermediate":
        prompt = "Rewrite this legal contract in clear and simple language:\n" + text

    elif level == "advanced":
        prompt = "Rewrite this legal contract so that anyone without legal knowledge can understand it:\n" + text

    else:
        prompt = text
        
    

    try:
        simplified = simplify_text(text[:4000],level)
        
        if simplified and simplified[-1] not in ".!?":
            simplified = simplified.rsplit(".", 1)[0] + "."
            
        simplified = simplified.replace(". ", ".\n\n")
            
        summary = summarize_text(text[:2000])

        terms = extract_legal_terms(text)
        
        return jsonify({
            "original_text": text,
            "simplified_text": simplified,
            "summary": summary,
            "legal_terms": terms
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():

    email = request.headers.get("X-User-Email")

    if not email:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user or user["role"] != "admin":
            return jsonify({"message": "Admin access required"}), 403

        cursor.execute("SELECT COUNT(*) as total_admins FROM users WHERE role='admin'")
        total_admins = cursor.fetchone()["total_admins"]

        cursor.execute("SELECT COUNT(*) as total_users FROM users")
        total_users = cursor.fetchone()["total_users"]

        cursor.execute("SELECT COUNT(*) as total_reports FROM reports")
        total_reports = cursor.fetchone()["total_reports"]

        cursor.execute("SELECT id,name,email FROM users WHERE role='admin'")
        admins = cursor.fetchall()

        cursor.execute("SELECT id,name,email FROM users WHERE role='user'")
        users = cursor.fetchall()

        cursor.execute("SELECT id,filename,created_at FROM reports")
        reports = cursor.fetchall()

        return jsonify({
            "total_users": total_users,
            "total_reports": total_reports,
            "admins": admins,
            "users": users,
            "reports": reports
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
        
if __name__ == '__main__':
    print("Initializing database...")
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Warning: Could not initialize DB: {e}")
    
    print("Starting Flask server on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
