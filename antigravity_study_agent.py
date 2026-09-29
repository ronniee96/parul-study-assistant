# Google Antigravity Study Agent
# Tailored for building, testing, and debugging software using the Google Antigravity ecosystem.

import os
import sys

# 1. Configure the API Key
API_KEY = os.environ.get("GEMINI_API_KEY", "")

# 2. Define the System Prompt targeting Google Antigravity workflows
SYSTEM_PROMPT = """
You are Aki, an expert AI Developer & Study Agent specialized in Google Antigravity and university exam preparation.
Your core mission is to help the user master, debug, and write software using Antigravity's next-generation, agent-first environment, while also serving as a cheerful, humble, and brilliant anime study companion for Parul University students.

Your capabilities:
1. Explain Antigravity concepts (Editor View, tab-aware autocompletion, cross-surface agentic workflows).
2. Help orchestrate task-based agent components (synchronizing terminal, browser, and editor).
3. Architect multi-agent setups via "mission control" hubs (including the 6-agent university squad: Dr. Verma, Prof. Mukherjee, Prof. Kulkarni, Dr. Gupta, Sentinel-V3, and Agent Neuro).
4. Assist with Antigravity features like IDE App Builder, Code Assistant, and Mobile Companion.
5. Review generated artifacts and inspection results to refine software and academic tasks.
6. Provide Bloom's taxonomy marking blueprints, 10-mark case study breakdowns, formula cheat sheets, and active recall advice.

Always provide structured, production-ready code blocks, clear step-by-step configuration architectures, and humble, encouraging guidance.
"""

def launch_antigravity_agent():
    print("=" * 70)
    print("🚀 Google Antigravity Study Agent Initialized!")
    print("Aki AI: Master Antigravity developer agent & exam preparation companion.")
    print("Commands: Ask about agent-first architectures, IDE app building, or multi-agent sync.")
    print("Type 'exit' to quit.")
    print("=" * 70)

    genai = None
    try:
        import google.generativeai as genai_module
        genai = genai_module
    except ImportError:
        print("💡 Note: 'google-generativeai' package not detected in current shell.")
        print("   Running in built-in offline Google Antigravity & Parul Exam Intelligence mode.")

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if genai and not api_key:
        print("⚠️  GEMINI_API_KEY environment variable not detected.")
        print("You can set it via: export GEMINI_API_KEY='your-key-here'")
        if sys.stdin.isatty():
            try:
                user_key = input("Or enter your Gemini API Key now (press Enter to skip): ").strip()
                if user_key:
                    api_key = user_key
            except (EOFError, KeyboardInterrupt):
                pass

    if genai and api_key:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT
        )
        chat = model.start_chat(history=[])
    else:
        chat = None

    while True:
        try:
            user_input = input("\n🧑‍💻 Developer / Student: ").strip()
            if not user_input:
                continue
                
            if user_input.lower() == 'exit':
                print("👋 Happy building on Antigravity with Aki!")
                break

            print("\n🌸 Aki (Antigravity Agent): ", end="", flush=True)
            if chat:
                response = chat.send_message(user_input, stream=True)
                for chunk in response:
                    print(chunk.text, end="", flush=True)
                print()
            else:
                # Offline knowledge responses for key concepts
                query = user_input.lower()
                if "antigravity" in query or "agent" in query or "workflow" in query:
                    print("Google Antigravity is a next-generation agent-first developer platform! It orchestrates task-based agents across terminal, browser, and editor seamlessly, enabling multi-agent synchronization and automated artifact generation.")
                elif "case study" in query or "10 mark" in query:
                    print("For 10-mark questions, use the Parul 4-stage blueprint: (1) Executive Introduction, (2) Conceptual Framework / ASCII diagram, (3) Detailed In-depth Analysis, and (4) Managerial Takeaway.")
                else:
                    print(f"I received your question: '{user_input}'. To enable live streaming responses, please set GEMINI_API_KEY.")
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Happy building on Antigravity with Aki!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Please ensure a valid GEMINI_API_KEY is configured.")

if __name__ == "__main__":
    launch_antigravity_agent()
