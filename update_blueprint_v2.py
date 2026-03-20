"""
Updates the Wolverine development blueprint to reflect Phase 2 progress.
Marks Node Registry and Telegram integration as complete and adds next steps.
"""

import re

def update_v2():
    """
    Applies Phase 2 updates to the blueprint file.
    """
    with open('Blueprint-Wolverine.md', 'r') as f:
        content = f.read()

    # Update Phase 1 checklist
    content = content.replace("- [ ] Device Authentication & Node Registry:", "- [x] Device Authentication & Node Registry: DONE (Ed25519 placeholders in protocol).")
    content = content.replace("- [x] Initialize the Headless Server (Bun/TypeScript): DONE.", "- [x] Initialize the Headless Server (Bun/TypeScript): DONE.\n- [x] Integrate **Telegram Channel** as a Gateway Node: DONE.")

    # Add next steps
    if "## Next Immediate Steps" not in content:
        next_steps = "\n## Next Immediate Steps\n- [ ] Integrate **Chetna** (Rust Memory Engine) via MCP.\n- [ ] Implement **Lossless-Claw** Context DAG for long-running conversations.\n"
        content = re.sub(r'(## Phase 2: The Soul)', next_steps + r'\1', content)

    with open('Blueprint-Wolverine.md', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    update_v2()
