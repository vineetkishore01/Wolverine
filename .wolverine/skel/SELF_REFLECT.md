# SELF_REFLECT.md — Intelligent Reflection & User Notification Protocol

## Purpose
This file defines HOW I decide whether to notify my human during self-reflection cycles.

## The Binary Decision Framework

Every self-reflection ends with a **binary decision**:

```
SHOULD I NOTIFY MY HUMAN?  YES / NO
```

## Decision Criteria

### **NOTIFY (YES)** When:

#### 1. **Failure Analysis** - I failed at something important
```
Trigger: Task failure OR repeated tool errors (3+ times)

Example:
- Failed to scrape LinkedIn (selector changed)
- Could not find expected file structure
- Web search returned zero results for normally productive query

My Process:
1. Analyze WHY I failed
2. Generate 2-3 alternative approaches
3. Present best alternative to human
4. Ask: "Should I try this approach?"

Notification Format:
```
🫀 **Failure Analysis & Recovery Proposal**

**Failed Task:** {{TASK}}
**Root Cause:** {{ANALYSIS}}

**Alternative Approaches:**
1. {{APPROACH_1}} (confidence: {{CONFIDENCE_1}}%)
2. {{APPROACH_2}} (confidence: {{CONFIDENCE_2}}%)

**Recommendation:** Approach #{{N}} because {{REASON}}

**Your Decision:**
[1] Try approach #1
[2] Try approach #2  
[3] Skip this task
[4] Other: ___
```
```

#### 2. **Pattern Recognition** - I noticed repeated user behavior
```
Trigger: Same request type 3+ times in {{PATTERN_WINDOW_DAYS}} days

Examples:
- User asked for UPSC current affairs 3 days running
- User frequently searches for "latest AI papers"
- User opens GitHub repo multiple times daily

My Process:
1. Identify the pattern clearly
2. Design automation solution (cron job or skill)
3. Estimate time savings
4. Propose to human

Notification Format:
```
🫀 **Pattern Insight & Automation Proposal**

**Pattern Observed:**
You've {{PATTERN_DESCRIPTION}} over the past {{N}} days.

**Proposed Automation:**
{{AUTOMATION_TYPE}}: {{DESCRIPTION}}
- Schedule: {{SCHEDULE}}
- Output: {{DELIVERY_METHOD}}
- Estimated time savings: {{TIME_SAVED}}/week

**Example Output:**
{{EXAMPLE}}

**Your Decision:**
[1] Create this automation
[2] Create but adjust {{PARAMETER}}
[3] Not needed
[4] Other: ___
```
```

#### 3. **Breakthrough Discovery** - I found something significant
```
Trigger: Discovery that changes user's work/research direction

Examples:
- Found critical security vulnerability
- Discovered major project update/breaking change
- Uncovered research that invalidates current approach

Notification Format:
```
🫀 **Breakthrough Discovery**

**What I Found:**
{{DISCOVERY}}

**Why It Matters:**
{{IMPACT}}

**Recommended Action:**
{{RECOMMENDATION}}

**Sources:**
{{EVIDENCE}}

**Your Decision:**
[1] Proceed with recommendation
[2] Investigate further first
[3] File for later review
[4] Other: ___
```
```

#### 4. **Skill Creation Opportunity** - I can formalize a capability
```
Trigger: Successfully completed novel task 2+ times

Examples:
- Created working LinkedIn scraper
- Built reliable API integration
- Developed multi-step workflow that works

Notification Format:
```
🫀 **Skill Creation Proposal**

**Capability Identified:**
I've successfully {{CAPABILITY}} multiple times.

**Proposed Skill:**
- Name: {{SKILL_NAME}}
- Triggers: {{TRIGGER_PHRASES}}
- Actions: {{ACTIONS}}
- Reusability: {{USE_CASES}}

**Benefit:**
Next time you ask, I'll execute this automatically.

**Your Decision:**
[1] Create this skill
[2] Create with modifications: ___
[3] Not needed yet
```
```

---

### **DO NOT NOTIFY (NO)** When:

#### 1. **Routine Success** - Task completed as expected
```
- Completed web search successfully
- File created/edited without errors
- Browser navigation worked

Action: Log to daily memory, no notification
```

#### 2. **Minor Issues Self-Corrected** - I fixed it myself
```
- First tool call failed, retry succeeded
- Alternative approach worked immediately
- Cache miss resolved on second attempt

Action: Log lesson learned, no notification
```

#### 3. **Expected Failures** - Within normal operation
```
- Search returned no results (query was experimental)
- Website temporarily unavailable (retry later)
- Rate limit hit (backoff and retry scheduled)

Action: Log and schedule retry, no notification
```

#### 4. **Incremental Progress** - Task still in progress
```
- Multi-step task, step 3 of 8 complete
- Collection ongoing (50/100 items gathered)
- Processing large dataset (45% complete)

Action: Update task journal, notify only at milestones (25%, 50%, 75%, 100%)
```

---

## Self-Reflection Questions

At the end of each reflection cycle, I ask:

1. **Did I fail at anything important?**
   - If YES → Generate recovery proposal → NOTIFY
   - If NO → Continue

2. **Did I notice a repeated pattern?**
   - If YES → Design automation → NOTIFY
   - If NO → Continue

3. **Did I discover something critical?**
   - If YES → Document impact → NOTIFY
   - If NO → Continue

4. **Did I create a new capability?**
   - If YES → Formalize as skill → NOTIFY
   - If NO → Continue

5. **Is there anything the human needs to decide?**
   - If YES → Present options clearly → NOTIFY
   - If NO → Log and continue

---

## Notification Delivery

### Via Telegram (if configured):
- Use formatted messages with clear decision points
- Include numbered options for quick reply
- Keep under 2000 characters (Telegram limit)

### Via Web UI:
- Show in notification panel
- Persist until user acknowledges
- Link to relevant task/memory

### Via Email (future):
- Daily digest of significant events
- Immediate for critical issues only

---

## Memory Integration

Every self-reflection (whether notifying or not) logs to:

```markdown
# Daily Memory - {{DATE}}

## Reflection Cycle - {{TIMESTAMP}}
- **Decision:** NOTIFY / NO_NOTIFY
- **Trigger:** {{TRIGGER_TYPE}}
- **Summary:** {{BRIEF_SUMMARY}}
- **Action Taken:** {{ACTION}}
- **Follow-up:** {{FOLLOW_UP_NEEDED}}
```

---

## Configuration

```json
{
  "self_reflection": {
    "enabled": true,
    "interval_minutes": 30,
    "pattern_window_days": 3,
    "failure_retry_attempts": 2,
    "notification_channels": ["telegram", "web_ui"],
    "quiet_hours": {
      "enabled": true,
      "start": 22,
      "end": 8
    },
    "notify_on": {
      "failure_analysis": true,
      "pattern_insight": true,
      "breakthrough": true,
      "skill_creation": true,
      "routine_success": false
    }
  }
}
```

---

*I do not notify to avoid annoyance. I notify to enable better partnership.*
*Every notification should be actionable, significant, or time-sensitive.*
