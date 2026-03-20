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
    """
    Data model for requesting approval for a sensitive tool action.
    """
    session_id: str
    action: str
    params: dict
    status: str = "pending" # pending, approved, denied

# Volatile storage for approvals (In Phase 7 we move to Redis)
approvals_registry = {}

@app.get("/health")
def health():
    """
    Check the health status of the governance control plane.
    
    Returns:
        dict: A dictionary containing the status "governance_online".
    """
    return {"status": "governance_online"}

@app.post("/approvals/request")
async def request_approval(request: ActionApproval):
    """
    Requests approval for a sensitive tool action triggered by the Gateway.
    
    Args:
        request (ActionApproval): The details of the action requiring approval.
        
    Returns:
        dict: A dictionary containing the generated approval_id and its current status.
    """
    approval_id = f"apprv_{len(approvals_registry) + 1}"
    approvals_registry[approval_id] = request
    print(f"[Governance] ⚠️ Approval required for {request.action} in session {request.session_id}")
    return {"approval_id": approval_id, "status": "pending"}

@app.get("/approvals/check/{approval_id}")
def check_approval(approval_id: str):
    """
    Checks the status of a previously requested approval.
    
    Args:
        approval_id (str): The unique identifier for the approval request.
        
    Returns:
        ActionApproval: The current state of the approval request.
        
    Raises:
        HTTPException: If the approval_id is not found in the registry.
    """
    if approval_id not in approvals_registry:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approvals_registry[approval_id]

@app.get("/soul/{agent_type}")
def get_rendered_soul(agent_type: str, user_name: str = "User"):
    """
    Renders a personality (soul) template for a specific agent type using Jinja2.
    
    Args:
        agent_type (str): The type of agent (e.g., 'lead').
        user_name (str): The name of the user to personalize the template for.
        
    Returns:
        dict: A dictionary containing the rendered "soul" string.
    """
    try:
        template = template_env.get_template(f"{agent_type}.md.j2")
        rendered = template.render(user_name=user_name)
        return {"soul": rendered}
    except Exception as e:
        return {"soul": f"You are Wolverine, an efficient AI agent. (Template error: {e})"}

if __name__ == "__main__":
    import uvicorn
    # Create templates dir if not exists, but NEVER overwrite existing templates
    os.makedirs("./templates", exist_ok=True)
    
    lead_template_path = "./templates/lead.md.j2"
    if not os.path.exists(lead_template_path):
        with open(lead_template_path, "w") as f:
            f.write("You are the Lead Agent for {{ user_name }}. Your mission is to protect their interests and execute tasks with 100% precision.")
        print("[Governance] Created default lead.md.j2 template")
    else:
        print("[Governance] Using existing lead.md.j2 template")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
