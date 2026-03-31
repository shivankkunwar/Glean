# Opencode Brainstorming & Refinement Workflow

## Model Comparison Results

Tested all opencode-go models on identical brainstorming task:

### **kimi-k2.5** - The Architect
- **Strength**: Structured, comprehensive, pivot suggestions
- **Style**: Organized sections, tables, technical details
- **Best for**: Initial analysis, alternative approaches, market viability
- **Rating style**: Balanced (4/10 on test)

### **minimax-m2.7** - The Skeptic
- **Strength**: Deepest ethical analysis, catches liability issues
- **Style**: Scientific validity focus, thorough privacy analysis
- **Best for**: Safety checks, regulatory concerns, edge cases
- **Rating style**: Conservative (4/10 on test)

### **minimax-m2.5** - The Pragmatist
- **Strength**: Practical solutions, creative fixes
- **Style**: Discussion format, "so what?" focus, actionable
- **Best for**: Problem-solving, iteration, implementation
- **Rating style**: Optimistic but realistic (5/10 on test)

### **glm-5** - The Analyst
- **Strength**: Business-focused, clear pros/cons
- **Style**: Balanced view, market reality assessment
- **Best for**: Viability checks, monetization, competition
- **Rating style**: Conservative (3/10 on test)

---

## Recommended 5-Phase Workflow

### **Phase 1: EXPLORE (kimi-k2.5)**
Generate possibilities without judgment.

```bash
opencode run -m "opencode-go/kimi-k2.5" "IDEA: [your idea]
Brainstorm deeply. Explore:
- All possible use cases and applications
- Target audiences
- Technical implementations
- Value propositions
- Creative variations and pivots
Be expansive and optimistic."
```

**What to capture**: Use cases, target markets, technical approaches, creative angles

---

### **Phase 2: CRITIQUE (minimax-m2.7)**
Harsh reality check focusing on ethics and safety.

```bash
opencode run -m "opencode-go/minimax-m2.7" "IDEA: [your idea]
Be ruthlessly critical. Identify:
1. Critical flaws that could kill the project
2. Ethical concerns and moral hazards
3. Privacy/security risks
4. Legal/regulatory issues (GDPR, COPPA, etc.)
5. Scientific/technical validity problems
6. Why users might hate this
7. Ways this could backfire spectacularly
8. Hidden assumptions that might be wrong
Don't hold back. Be the devil's advocate."
```

**What to capture**: Dealbreakers, safety issues, liability risks, false assumptions

---

### **Phase 3: SOLVE (minimax-m2.5)**
Transform criticism into solutions.

```bash
opencode run -m "opencode-go/minimax-m2.5" "IDEA: [your idea]
ADDRESS THESE CRITICISMS:
[paste Phase 2 output here]

For each major issue, provide:
1. A concrete fix or workaround
2. How to implement it
3. Trade-offs involved
4. Whether it changes the core value proposition

Focus on practical solutions that preserve what makes the idea good."
```

**What to capture**: Specific fixes, implementation strategies, trade-off analysis

---

### **Phase 4: VALIDATE (glm-5)**
Business reality check.

```bash
opencode run -m "opencode-go/glm-5" "REFINED IDEA: [idea with Phase 3 fixes]
Business analysis:
1. Target market size and willingness to pay
2. Competitive landscape (direct & indirect)
3. Monetization strategies
4. Customer acquisition challenges
5. Unit economics (if applicable)
6. Go-to-market strategy
7. Why this is better than alternatives
8. Potential acquirers or partners

Rate market viability 1-10 with detailed justification."
```

**What to capture**: Market fit, competition, business model, growth strategy

---

### **Phase 5: SYNTHESIZE (kimi-k2.5)**
Final polished concept.

```bash
opencode run -m "opencode-go/kimi-k2.5" "FINAL CONCEPT SYNTHESIS

Original Idea: [initial idea]
Key Criticisms: [summary from Phase 2]
Solutions Applied: [summary from Phase 3]
Business Viability: [summary from Phase 4]

Create final refined concept:
1. Elevator pitch (2 sentences max)
2. Core value proposition
3. Key differentiators (3-5 bullets)
4. Target audience with personas
5. Critical risks and mitigations
6. MVP scope
7. Success metrics
8. Next 3 validation steps

Final rating: X/10
Confidence level: High/Medium/Low
Recommendation: Proceed/Pivot/Kill

If rating < 7: What changes would make this a 9/10?"
```

**What to capture**: Final pitch, action plan, go/no-go decision

---

## Advanced Techniques

### **The Red Team Exercise**
```bash
# Position A: Strong advocate
opencode run -m "opencode-go/kimi-k2.5" "ARGUE PASSIONATELY FOR: [idea]
You're pitching to Y Combinator. Make the strongest possible case."

# Position B: Ruthless critic
opencode run -m "opencode-go/minimax-m2.7" "ARGUE VEHEMENTLY AGAINST: [idea]
You're a skeptical VC who sees 1000 pitches/year. Tear this apart."

# Resolution
opencode run -m "opencode-go/minimax-m2.5" "SYNTHESIZE DEBATE
Advocate's points: [paste Position A]
Critic's points: [paste Position B]

What's the truth? Which concerns are valid? Which opportunities are real?"
```

### **Persona Validation**
```bash
opencode run -m "opencode-go/kimi-k2.5" "As a 25-year-old tech worker, would you use [idea]? Why or why not?"

opencode run -m "opencode-go/glm-5" "As a 45-year-old parent, would you pay for [idea]? What would convince you?"

opencode run -m "opencode-go/minimax-m2.7" "As a privacy-conscious security researcher, what red flags do you see in [idea]?"

opencode run -m "opencode-go/minimax-m2.5" "As a bootstrapped startup founder, how would you implement [idea] with $10k budget?"
```

### **The Iteration Ladder**
```bash
# v0.1 - Initial concept
opencode run -m "opencode-go/kimi-k2.5" "IDEA v0.1: [concept]"

# v0.2 - Address top 3 criticisms
opencode run -m "opencode-go/minimax-m2.5" "IDEA v0.2: [concept] addressing [top 3 criticisms from v0.1]"

# v0.3 - Incorporate pivot suggestion
opencode run -m "opencode-go/kimi-k2.5" "IDEA v0.3: [concept] incorporating [pivot suggestion from v0.2]"

# Continue until rating >= 8/10
```

---

## Command Templates

### Quick Analysis (All Models)
```bash
#!/bin/bash
IDEA="Your idea here"

echo "=== KIMI-K2.5 (Overview) ==="
opencode run -m "opencode-go/kimi-k2.5" "Analyze: $IDEA"

echo "=== MINIMAX-M2.7 (Critique) ==="
opencode run -m "opencode-go/minimax-m2.7" "Critique harshly: $IDEA"

echo "=== MINIMAX-M2.5 (Solutions) ==="
opencode run -m "opencode-go/minimax-m2.5" "Solve issues in: $IDEA"

echo "=== GLM-5 (Business) ==="
opencode run -m "opencode-go/glm-5" "Business case for: $IDEA"
```

### Deep Dive
```bash
opencode run -m "opencode-go/kimi-k2.5" "IDEA: [X]
PHASE: Brainstorm
INSTRUCTION: Generate 20 different variations and applications"

opencode run -m "opencode-go/minimax-m2.7" "IDEA: [X]
PHASE: Risk Assessment
INSTRUCTION: Identify top 10 ways this could fail or cause harm"

opencode run -m "opencode-go/minimax-m2.5" "IDEA: [X]
PHASE: Solution Design
INSTRUCTION: For each risk, design a specific mitigation"

opencode run -m "opencode-go/glm-5" "IDEA: [X]
PHASE: Market Validation
INSTRUCTION: Estimate TAM, SAM, SOM and customer acquisition cost"
```

---

## When to Use Which Model

| Situation | Primary Model | Backup Model |
|-----------|--------------|--------------|
| Initial concept exploration | kimi-k2.5 | minimax-m2.5 |
| Safety/ethics review | minimax-m2.7 | kimi-k2.5 |
| Finding solutions to problems | minimax-m2.5 | kimi-k2.5 |
| Business model validation | glm-5 | kimi-k2.5 |
| Technical feasibility | minimax-m2.5 | kimi-k2.5 |
| Competitive analysis | glm-5 | minimax-m2.7 |
| Creative variations | minimax-m2.5 | kimi-k2.5 |
| Final pitch polish | kimi-k2.5 | glm-5 |

---

## Pro Tips

1. **Chain outputs**: Copy output from one model into the next prompt for context
2. **Be explicit**: Say "Brainstorm deeply" or "Critique harshly" - models respond to tone
3. **Ask for ratings**: Forces quantitative assessment: "Rate 1-10 with justification"
4. **Iterate on low scores**: "What would make this an 8/10?"
5. **Use constraints**: "Suggest 3 approaches under $1000 budget"
6. **Request specific formats**: "Give me a table of pros/cons"
7. **Challenge assumptions**: "What if [key assumption] is wrong?"
8. **Combine perspectives**: Run multiple models and synthesize manually
9. **Save sessions**: Use `opencode export <session-id>` to preserve good conversations
10. **Time-box**: If stuck after 3 iterations, consider pivoting or killing the idea

---

## Quality Thresholds

### **Kill the idea if:**
- All models rate it < 4/10
- minimax-m2.7 identifies existential legal/safety issues
- No clear solution to top 3 criticisms
- glm-5 identifies no viable business model

### **Pivot if:**
- Average rating 4-6/10
- Core concept has merit but implementation is wrong
- Target audience or use case is off
- Technology exists but application is misguided

### **Proceed if:**
- Average rating >= 7/10
- Solutions exist for all major criticisms
- At least one model is genuinely excited
- Clear path to validation within 30 days

---

## Example Session Log

**IDEA**: AI-powered email assistant that writes responses

**Phase 1 (kimi-k2.5)**: Rating 6/10 - "Good concept but crowded market, needs differentiation"

**Phase 2 (minimax-m2.7)**: Identified privacy risks, potential for generating harmful content, liability for business emails

**Phase 3 (minimax-m2.5)**: Solutions: on-device processing only, human-in-the-loop approval, specialized for specific industries

**Phase 4 (glm-5)**: Rating 5/10 - "Superhuman and others dominate, need niche focus"

**Phase 5 (kimi-k2.5)**: Final rating 7/10 with pivot to "AI email assistant for healthcare providers with HIPAA compliance built-in"

**DECISION**: Proceed with niche pivot

---

*Generated by Opencode through systematic testing of all opencode-go models*
