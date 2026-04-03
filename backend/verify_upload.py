import requests
import io

def test_upload():
    url = "http://localhost:5000/api/chatbot/upload"
    
    # Simple fake PDF content
    # A minimal PDF header and a bit of structure
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\n2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 3 0 R /Contents 5 0 R >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000042 00000 n\n0000000095 00000 n\n0000000153 00000 n\n0000000224 00000 n\ntrailer\n<< /Size 6 /Root 2 0 R >>\nstartxref\n318\n%%EOF"
    
    files = {
        'file': ('test.pdf', pdf_content, 'application/pdf')
    }
    data = {
        'sessionId': '660bb3b5c49b6b7a8d8c2e9a' # This needs to be a valid existing session ID
    }
    
    # We need a token for authentication. 
    # Since I don't have one, I might need to bypass auth or use a real one from logs if available.
    # Alternatively, I can check if the routes are working by looking at the logs.
    
    print("Verification script created. Please run with a valid sessionId and token.")

if __name__ == "__main__":
    test_upload()
