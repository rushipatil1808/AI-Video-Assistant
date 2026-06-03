"""
Premium AI Video Assistant SaaS Platform
Inspired by Linear, Arc Browser, Notion, Framer, Granola AI, and Perplexity

This is a complete frontend redesign while preserving all backend functionality.
The backend modules (core/, utils/, backend/) remain completely untouched.
"""

import streamlit as st
import time
from dotenv import load_dotenv

# Import existing backend modules (DO NOT MODIFY)
from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_action_items, extract_key_decisions, extract_questions
from core.rag_engine import build_rag_chain, ask_question

# Import new premium frontend components
from frontend_new.styles.theme_system import get_theme_config
from frontend_new.styles.main_styles import get_base_styles
from frontend_new.components.ui_components import UIComponents
from frontend_new.pages.dashboard import render_dashboard_page
from frontend_new.pages.analysis import render_analysis_workspace, render_analysis_empty_state
from frontend_new.pages.chat import render_chat_workspace
from frontend_new.utils.state_manager import StateManager, NavigationManager, CommandPalette

# Load environment variables
load_dotenv()

# ===============================================
# PAGE CONFIGURATION
# ===============================================

st.set_page_config(
    page_title="VideoAI - Premium Video Intelligence Platform",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="collapsed",  # We'll use our custom sidebar
    menu_items={
        'Get Help': None,
        'Report a bug': None,
        'About': None
    }
)

# ===============================================
# INITIALIZE PREMIUM FRONTEND
# ===============================================

def initialize_app():
    """Initialize the premium SaaS application"""
    
    # Initialize session state
    StateManager.initialize_session_state()
    
    # Get current theme configuration
    theme_config = StateManager.get_current_theme()
    
    # Apply premium styles
    st.markdown(get_base_styles(theme_config), unsafe_allow_html=True)
    
    # Add custom JavaScript for enhanced interactions
    st.markdown("""
    <script>
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Command palette (Ctrl/Cmd + K)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.parent.postMessage({type: 'TOGGLE_COMMAND_PALETTE'}, '*');
        }
        
        // Toggle theme (Ctrl/Cmd + T)
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            window.parent.postMessage({type: 'TOGGLE_THEME'}, '*');
        }
        
        // Toggle sidebar (Ctrl/Cmd + B)
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            window.parent.postMessage({type: 'TOGGLE_SIDEBAR'}, '*');
        }
    });
    
    // Handle messages from components
    window.addEventListener('message', function(e) {
        if (e.data.type === 'TOGGLE_SIDEBAR') {
            // Trigger sidebar toggle
        } else if (e.data.type === 'TOGGLE_THEME') {
            // Trigger theme toggle
        } else if (e.data.type === 'TOGGLE_COMMAND_PALETTE') {
            // Trigger command palette
        }
    });
    
    // Smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
    
    // Auto-resize textareas
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', () => autoResize(textarea));
    });
    </script>
    """, unsafe_allow_html=True)

# ===============================================
# MAIN APPLICATION LAYOUT
# ===============================================

def render_main_layout():
    """Render the main application layout"""
    
    # Create the main container
    st.markdown('<div class="app-container">', unsafe_allow_html=True)
    
    # Render custom sidebar
    sidebar_expanded_class = "sidebar-expanded" if st.session_state.sidebar_expanded else ""
    current_page = st.session_state.get("current_page", "dashboard")
    
    st.markdown(UIComponents.render_sidebar(current_page), unsafe_allow_html=True)
    
    # Main content area
    st.markdown(f'<div class="main-content {sidebar_expanded_class}">', unsafe_allow_html=True)
    
    # Top navigation bar
    st.markdown(UIComponents.render_top_nav(), unsafe_allow_html=True)
    
    # Page content container
    st.markdown('<div style="padding: 2rem;">', unsafe_allow_html=True)
    
    # Render current page
    render_current_page()
    
    # Close containers
    st.markdown('</div>', unsafe_allow_html=True)  # Page content
    st.markdown('</div>', unsafe_allow_html=True)  # Main content
    st.markdown('</div>', unsafe_allow_html=True)  # App container
    
    # Command palette (if active)
    command_palette_html = CommandPalette.render_command_palette()
    if command_palette_html:
        st.markdown(command_palette_html, unsafe_allow_html=True)

# ===============================================
# PAGE ROUTING
# ===============================================

def render_current_page():
    """Render the current active page"""
    
    current_page = st.session_state.get("current_page", "dashboard")
    
    if current_page == "dashboard":
        render_dashboard_page()
        
    elif current_page == "analysis":
        render_analysis_page()
        
    elif current_page == "chat":
        render_chat_page()
        
    elif current_page == "library":
        render_library_page()
        
    elif current_page == "transcripts":
        render_transcripts_page()
        
    elif current_page == "knowledge":
        render_knowledge_page()
        
    elif current_page == "search":
        render_search_page()
        
    elif current_page == "settings":
        render_settings_page()
        
    else:
        # Default to dashboard
        render_dashboard_page()

# ===============================================
# PAGE IMPLEMENTATIONS
# ===============================================

def render_analysis_page():
    """Render the video analysis page"""
    
    # Check if we have analysis results
    if st.session_state.get("result"):
        # Show analysis workspace with results
        result_data = st.session_state.result
        render_analysis_workspace(result_data)
    else:
        # Show empty state with input form
        st.markdown(render_analysis_empty_state(), unsafe_allow_html=True)
        
        # Premium input form
        render_analysis_input_form()

def render_analysis_input_form():
    """Premium video analysis input form"""
    
    st.markdown('<div style="max-width: 800px; margin: 2rem auto;">', unsafe_allow_html=True)
    
    # Hero section with input
    st.markdown(UIComponents.render_hero_section(), unsafe_allow_html=True)
    
    # Quick actions
    st.markdown(UIComponents.render_quick_actions(), unsafe_allow_html=True)
    
    # Handle form submission
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        with st.form("video_analysis_form", clear_on_submit=False):
            st.markdown('<div class="card" style="padding: 2rem;">', unsafe_allow_html=True)
            
            source = st.text_input(
                "Video Source",
                placeholder="https://youtube.com/watch?v=... or upload file",
                help="Enter a YouTube URL or upload a video file"
            )
            
            col_lang, col_btn = st.columns([1, 1])
            
            with col_lang:
                language = st.selectbox(
                    "Language",
                    options=["english", "hinglish"],
                    index=0
                )
            
            with col_btn:
                st.markdown('<div style="padding-top: 1.5rem;">', unsafe_allow_html=True)
                submit_button = st.form_submit_button(
                    "🚀 Analyze Video",
                    use_container_width=True
                )
                st.markdown('</div>', unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            if submit_button and source.strip():
                run_video_analysis_pipeline(source, language)
    
    st.markdown('</div>', unsafe_allow_html=True)

def run_video_analysis_pipeline(source, language):
    """Run the video analysis pipeline (using existing backend)"""
    
    try:
        # Reset state
        st.session_state.pipeline_done = False
        st.session_state.result = None
        st.session_state.chat_history = []
        st.session_state.pipeline_steps = {}
        
        # Create progress container
        progress_container = st.empty()
        
        with progress_container.container():
            # Processing steps configuration
            steps = {
                "audio": {"icon": "🔊", "label": "Audio Processing", "status": "pending"},
                "transcript": {"icon": "📝", "label": "Transcription", "status": "pending"},
                "title": {"icon": "🏷️", "label": "Title Generation", "status": "pending"},
                "summary": {"icon": "📋", "label": "Summarization", "status": "pending"},
                "extract": {"icon": "🔍", "label": "Information Extraction", "status": "pending"},
                "rag": {"icon": "🧠", "label": "RAG Engine Setup", "status": "pending"},
            }
            
            st.markdown('<div style="max-width: 600px; margin: 2rem auto;">', unsafe_allow_html=True)
            st.markdown('### 🔄 Processing Your Video')
            st.markdown('Please wait while we analyze your content...')
            
            status_placeholder = st.empty()
            
            # Step 1: Audio Processing
            steps["audio"]["status"] = "active"
            status_placeholder.markdown(UIComponents.render_processing_status(steps), unsafe_allow_html=True)
            
            chunks = process_input(source)
            StateManager.add_recent_activity("processing", "Audio Processing", f"Processed audio from {source[:50]}...", "🔊")
            
            steps["audio"]["status"] = "done"
            
            # Step 2: Transcription
            steps["transcript"]["status"] = "active"
            status_placeholder.markdown(UIComponents.render_processing_status(steps), unsafe_allow_html=True)
            
            transcript = transcribe_all(chunks, language)
            StateManager.add_recent_activity("transcription", "Transcription Complete", f"Generated transcript ({len(transcript)} characters)", "📝")
            
            steps["transcript"]["status"] = "done"
            
            # Step 3: Title Generation
            steps["title"]["status"] = "active"
            status_placeholder.markdown(UIComponents.render_processing_status(steps), unsafe_allow_html=True)
            
            title = generate_title(transcript)
            steps["title"]["status"] = "done"
            
            # Step 4: Summarization
            steps["summary"]["status"] = "active"
            status_placeholder.markdown(UIComponents.render_processing_status(steps), unsafe_allow_html=True)
            
            summary = summarize(transcript)
            StateManager.increment_stat("summaries_generated")
            steps["summary"]["status"] = "done"
            
            # Step 5: Information Extraction
            steps["extract"]["status"] = "active"
            status_placeholder.markdown(UIComponents.render_processing_status(steps), unsafe_allow_html=True)
            
            action_items = extract_action_items(transcript)
            decisions = extract_key_decisions(transcript)
            questions = extract_questions(transcript)
            steps["extract"]["status"] = "done"
            
            # Step 6: RAG Engine Setup
            steps["rag"]["status"] = "active"
            status_placeholder.markdown(UIComponents.render_processing_status(steps), unsafe_allow_html=True)
            
            rag_chain = build_rag_chain(transcript)
            steps["rag"]["status"] = "done"
            
            # Store results
            result_data = {
                "title": title,
                "transcript": transcript,
                "summary": summary,
                "action_items": action_items,
                "key_decisions": decisions,
                "open_questions": questions,
                "rag_chain": rag_chain,
                "source": source,
                "language": language,
                "processed_at": time.time()
            }
            
            st.session_state.result = result_data
            st.session_state.pipeline_done = True
            
            # Update statistics
            StateManager.increment_stat("videos_processed")
            StateManager.add_recent_activity("analysis", "Video Analysis Complete", title, "🎬")
            StateManager.add_notification("Analysis Complete", f"Successfully analyzed: {title}", "success")
            
            # Success message
            st.success("✅ Analysis complete! Redirecting to results...")
            time.sleep(1)
            
            st.markdown('</div>', unsafe_allow_html=True)
        
        # Clear progress and show results
        progress_container.empty()
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Analysis failed: {str(e)}")
        StateManager.add_notification("Analysis Failed", str(e), "error")

def render_chat_page():
    """Render the chat page"""
    
    result_data = st.session_state.get("result")
    chat_history = st.session_state.get("chat_history", [])
    
    if result_data:
        # Chat workspace with three panels
        render_chat_workspace(result_data, chat_history)
        
        # Chat input handling
        handle_chat_input(result_data)
    else:
        # Empty state - no video analyzed yet
        st.markdown(render_chat_workspace(), unsafe_allow_html=True)

def handle_chat_input(result_data):
    """Handle chat input and responses"""
    
    # Chat input form
    with st.form("chat_form", clear_on_submit=True):
        col1, col2 = st.columns([5, 1])
        
        with col1:
            user_input = st.text_area(
                "Ask a question",
                placeholder="What are the main takeaways from this video?",
                height=60,
                label_visibility="collapsed"
            )
        
        with col2:
            st.markdown('<div style="padding-top: 1rem;">', unsafe_allow_html=True)
            send_button = st.form_submit_button("Send", use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
        
        if send_button and user_input.strip():
            # Add user message
            StateManager.add_chat_message("user", user_input.strip())
            
            # Generate AI response
            with st.spinner("🤔 Thinking..."):
                try:
                    rag_chain = result_data.get("rag_chain")
                    if rag_chain:
                        answer = ask_question(rag_chain, user_input.strip())
                        StateManager.add_chat_message("assistant", answer)
                        
                        # Update statistics
                        StateManager.increment_stat("chat_sessions")
                        StateManager.add_recent_activity("chat", "Chat Question", user_input[:50] + "...", "💬")
                    else:
                        st.error("RAG engine not available. Please re-analyze the video.")
                        
                except Exception as e:
                    error_msg = f"Sorry, I encountered an error: {str(e)}"
                    StateManager.add_chat_message("assistant", error_msg)
            
            st.rerun()

# Placeholder page functions (implement as needed)
def render_library_page():
    st.markdown("# 📚 Library")
    st.info("Library page - Coming soon!")

def render_transcripts_page():
    st.markdown("# 📝 Transcripts")
    st.info("Transcripts page - Coming soon!")

def render_knowledge_page():
    st.markdown("# 🧠 Knowledge Base")
    st.info("Knowledge base page - Coming soon!")

def render_search_page():
    st.markdown("# 🔍 Search")
    st.info("Search page - Coming soon!")

def render_settings_page():
    st.markdown("# ⚙️ Settings")
    st.info("Settings page - Coming soon!")

# ===============================================
# MAIN APPLICATION ENTRY POINT
# ===============================================

def main():
    """Main application entry point"""
    
    # Initialize the premium SaaS app
    initialize_app()
    
    # Render the main layout
    render_main_layout()

if __name__ == "__main__":
    main()