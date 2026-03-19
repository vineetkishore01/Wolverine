from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import jinja2
import os

app = FastAPI(title="Wolverine Governance Mission Control")

# Jinja2 setup for Personality Templating
template_loader = jinja2.FileSystemLoader(searchpath="./templates")
template_env = jinja2.Environment(loader=template_loader)

class ActionApproval(BaseModel):
    session_id: str
    action: str
    params: dict
    status: str = "pending" # pending, approved, denied

# Volatile storage for approvals (In Phase 7 we move to Redis)
approvals_registry = {}

@app.get("/health")
def health():
    return {"status": "governance_online"}

@app.post("/approvals/request")
async def request_approval(request: ActionApproval):
    """Called by Wolverine Gateway when a sensitive tool is triggered."""
    approval_id = f"apprv_{len(approvals_registry) + 1}"
    approvals_registry[approval_id] = request
    print(f"[Governance] ⚠️ Approval required for {request.action} in session {request.session_id}")
    return {"approval_id": approval_id, "status": "pending"}

@app.get("/approvals/check/{approval_id}")
def check_approval(approval_id: str):
    if approval_id not in approvals_registry:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approvals_registry[approval_id]

@app.get("/soul/{agent_type}")
def get_rendered_soul(agent_type: str, user_name: str = "User"):
    """Renders a personality using Jinja2."""
    try:
        template = template_env.get_template(f"{agent_type}.md.j2")
        rendered = template.render(user_name=user_name)
        return {"soul": rendered}
    except Exception as e:
        return {"soul": f"You are Wolverine, an efficient AI agent. (Template error: {e})"}

if __name__ == "__main__":
    import uvicorn
    # Create templates dir if not exists
    os.makedirs("./templates", exist_ok=True)
    with open("./templates/lead.md.j2", "w") as f:
        f.write("You are the Lead Agent for {{ user_name }}. Your mission is to protect their interests and execute tasks with 100% precision.")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
