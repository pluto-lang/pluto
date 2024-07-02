import os
import json

from simpleaichat import AIChat
from simpleaichat.utils import wikipedia_search, wikipedia_search_lookup

from pluto_client import Router, HttpRequest, HttpResponse, Bucket


router = Router("router")
sessions = Bucket("sessions")

basic_args = {
    "console": False,
    "api_key": os.environ.get("OPENAI_API_KEY"),
    "api_url": os.environ.get("CHAT_API_URL"),
}


def chat_handler(req: HttpRequest) -> HttpResponse:
    """Chat in a session with the AI using simpleaichat."""
    session_id = req.query.get("session_id")
    query = req.query.get("query")
    if session_id is None or query is None:
        return HttpResponse(
            status_code=400,
            body=json.dumps({"error": "session_id and query are required."}),
        )

    ai = AIChat(**basic_args)

    # Load the session from bucket if it exists
    ai_chat_sess_id = None
    output_path = f"/tmp/${session_id}.json"
    try:
        sessions.get(session_id, output_path)
        ai.load_session(input_path=output_path, **basic_args)
        with open(output_path, "r") as f:
            ai_chat_sess_id = json.load(f)["id"]
    except Exception:
        ai_chat_sess_id = ai.default_session.id
        pass

    response = ai(query, id=ai_chat_sess_id)

    # Save the session to the bucket
    ai.save_session(
        output_path=output_path,
        format="json",
        minify=True,
        id=ai_chat_sess_id,
    )
    sessions.put(session_id, output_path)

    return HttpResponse(status_code=200, body=json.dumps(response))


def qa_handler(req: HttpRequest) -> HttpResponse:
    """Ask a question to the AI using simpleaichat."""
    query = req.query.get("query")
    if query is None:
        return HttpResponse(
            status_code=400,
            body=json.dumps({"error": "query is required."}),
        )

    ai = AIChat(**basic_args)
    response = ai(query)
    return HttpResponse(status_code=200, body=json.dumps(response))


# This uses the Wikipedia Search API.
# Results from it are nondeterministic, your mileage will vary.
def search(query):
    """Search the internet."""
    wiki_matches = wikipedia_search(query, n=3)
    return {"context": ", ".join(wiki_matches), "titles": wiki_matches}


def lookup(query):
    """Lookup more information about a topic."""
    page = wikipedia_search_lookup(query, sentences=3)
    return page


def wikipedia_handler(req: HttpRequest) -> HttpResponse:
    """Get information from Wikipedia using simpleaichat."""
    query = req.query.get("query")
    if query is None:
        return HttpResponse(
            status_code=400,
            body=json.dumps({"error": "query is required."}),
        )

    params = {"temperature": 0.0, "max_tokens": 100}
    ai = AIChat(params=params, **basic_args)
    response = ai(query, tools=[search, lookup])
    return HttpResponse(status_code=200, body=json.dumps(response))


# Define routes for the ApiGateway
router.get("/chat", chat_handler)
router.get("/qa", qa_handler)
router.get("/wikipedia", wikipedia_handler)
