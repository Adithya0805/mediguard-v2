import os
import sys
from dotenv import load_dotenv

# Load environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from app.config import settings

def main():
    provider = settings.LLM_PROVIDER.lower()
    print("=========================================================")
    print(f"      MEDIGUARD V2 - LLM PROVIDER CONNECTION TESTER")
    print("=========================================================")
    print(f"Active Provider: {provider.upper()}")
    
    if provider == "gemini":
        key = settings.GEMINI_API_KEY
        print(f"API Key:         {key[:8] if key else 'None'}... [Masked]")
        
        if not key or key.startswith("your-") or "mock" in key.lower():
            print("\n[ERROR] Gemini API Key is missing or using placeholder in .env!")
            print("Please get a free key starting with 'AIzaSy' from: https://aistudio.google.com/")
            return
            
        if not key.startswith("AIzaSy"):
            print("\n[WARNING] Your Gemini key does not start with 'AIzaSy'.")
            print("Standard Google AI Studio keys always start with the prefix 'AIzaSy'.")
            print("Please make sure you copied the API key from: https://aistudio.google.com/")
            
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.messages import HumanMessage
            
            print("\nInitializing ChatGoogleGenerativeAI...")
            client = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash", 
                google_api_key=key
            )
            print("Invoking Gemini Flash...")
            response = client.invoke([HumanMessage(content="Say: Ready")])
            print("[SUCCESS] Gemini connected successfully!")
            print("Response:", response.content)
            
        except Exception as e:
            print("[FAIL] Connection failed:", str(e))
            
    elif provider == "groq":
        key = settings.GROQ_API_KEY
        print(f"API Key:         {key[:8] if key else 'None'}... [Masked]")
        
        if not key or key.startswith("your-") or "mock" in key.lower():
            print("\n[ERROR] Groq API Key is missing or using placeholder in .env!")
            print("Please get a free key starting with 'gsk_' from: https://console.groq.com/")
            return
            
        try:
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage
            
            print("\nInitializing ChatGroq...")
            client = ChatGroq(
                model="llama3-8b-8192", 
                groq_api_key=key
            )
            print("Invoking Groq Llama-3...")
            response = client.invoke([HumanMessage(content="Say: Ready")])
            print("[SUCCESS] Groq connected successfully!")
            print("Response:", response.content)
            
        except Exception as e:
            print("[FAIL] Connection failed:", str(e))

if __name__ == "__main__":
    main()
