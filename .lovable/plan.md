
# Cuban Psychology Society — Electronic Voting App

## Overview
A secure, Spanish-language web application for the Cuban Psychology Society's elections. Members authenticate with their Member Number and ID Card, view candidate proposals, cast their votes, and confirm adherence to the Code of Ethics. An admin commission manages the process through a separate dashboard.

---

## 1. Authentication & Member Verification
- **Login page** with two fields: *Número de Miembro* and *Carné de Identidad*
- Cross-references credentials against a pre-loaded member database (~700 members)
- Only members marked as **"al día"** (2026 fees paid) are granted access
- Members who have already voted see a confirmation message and cannot vote again
- Separate **admin login** with username/password credentials

## 2. Candidate Proposals Gallery
- A visually organized gallery displaying up to **30 candidates**
- Each card shows the candidate's **photo, name, and biography**
- Responsive layout that works well on phones (important for accessibility in Cuba)

## 3. Voting Interface
- Full list of candidates with two selectable columns: **Presidente** and **Miembro**
- **Voting rules enforced in the UI:**
  - Exactly **1 President** must be selected
  - Up to **10 additional Members** (max 11 total selections)
  - Selecting a candidate as President automatically checks them as Member
- Clear visual feedback showing remaining selections allowed

## 4. Code of Ethics Confirmation
- After submitting votes, a mandatory **Sí/No** question about accepting the Society's Code of Ethics
- Must answer before the vote is finalized and recorded

## 5. Vote Submission & Security
- Votes are stored **anonymously** — only aggregate totals are kept, no link between voter and choices
- Each member can vote **only once** (tracked by member record, not by vote content)
- Confirmation screen shown after successful submission

## 6. Admin Dashboard (Electoral Commission)
- **Separate login** with admin credentials
- **Candidate management:** Upload candidate data (photos, names, bios) via CSV and/or form
- **Member management:** Bulk import members via CSV/Excel upload (member number, ID card, fee status)
- **Election controls:** Open/close voting period
- **Results view:** Vote totals are hidden until admin manually reveals results after voting closes
- **Participation stats:** Number of members who have voted vs. total eligible

## 7. Design & Language
- **Clean, institutional design** with professional colors befitting an official organization
- Entire interface in **Spanish**
- Mobile-responsive for accessibility across devices common in Cuba

## 8. Backend (Lovable Cloud + Supabase)
- Secure database for members, candidates, and anonymous vote tallies
- Edge functions for vote validation and submission
- Row-Level Security to protect data integrity
- No external dependencies that might be blocked in Cuba
