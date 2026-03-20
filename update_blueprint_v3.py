"""
Updates the Wolverine development blueprint to reflect Phase 3 progress.
Marks Chetna (Rust Memory Layer) integration as complete.
"""

def update_v3():
    """
    Applies Phase 3 updates to the blueprint file.
    """
    with open('Blueprint-Wolverine.md', 'r') as f:
        content = f.read()

    # Update Phase 2 checklist
    content = content.replace("- [ ] Long-Term Memory (Chetna):", "- [x] Long-Term Memory (Chetna): DONE (Rust sidecar integrated via MCP).")
    content = content.replace("- [ ] Integrate **Chetna** (Rust Memory Engine) via MCP.", "- [x] Integrate **Chetna** (Rust Memory Engine) via MCP: DONE.")

    with open('Blueprint-Wolverine.md', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    update_v3()
