"""
PassTrack Digital Assignment Report Generator
Generates a professional Word document (.docx) with:
  - Title Page
  - Team Member Details
  - Project Explanation
  - Full Source Code (all project files)
  - Output Placeholders (for user to insert screenshots)

Dependencies: pip install python-docx
"""

import os
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# ─── Configuration ───
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(PROJECT_DIR, "PassTrack_Assignment_Report.docx")

TITLE = "PassTrack – Secure Digital Token Distribution & QR-Based Access Control System"
SUBTITLE = "Digital Assignment Report"
COURSE = "Master of Computer Applications (MCA)"
SUBJECT = "Web Technologies Lab"

TEAM_MEMBERS = [
    {"name": "ANANYA CHANDRA", "regno": "25MCA1065"},
]

# Files to include in the report, grouped by module
CODE_FILES = [
    # Root
    ("index.html", "Landing Page – HTML"),
    ("style.css", "Landing Page – CSS"),

    # Firebase Config
    ("lib/firebase-config.js", "Firebase Configuration"),

    # Auth Module
    ("auth/login.html", "Organizer Login – HTML"),
    ("auth/login.css", "Organizer Login – CSS"),
    ("auth/login.js", "Organizer Login – JavaScript"),

    # Organizer Module
    ("organizer/dashboard.html", "Organizer Dashboard – HTML"),
    ("organizer/dashboard.css", "Organizer Dashboard – CSS"),
    ("organizer/dashboard.js", "Organizer Dashboard – JavaScript"),
    ("organizer/manage-event.html", "Event Management – HTML"),
    ("organizer/manage-event.css", "Event Management – CSS"),
    ("organizer/manage-event.js", "Event Management – JavaScript"),

    # Distributor / Scanner Module
    ("distributor/distributor.html", "Staff Login – HTML"),
    ("distributor/distributor.css", "Staff Login – CSS"),
    ("distributor/distributor.js", "Staff Login – JavaScript"),
    ("distributor/scanner.html", "QR Scanner – HTML"),
    ("distributor/scanner.css", "QR Scanner – CSS"),
    ("distributor/scanner.js", "QR Scanner – JavaScript"),

    # Viewer Module
    ("viewer/viewer.html", "Participant Pass Viewer – HTML"),
    ("viewer/viewer.css", "Participant Pass Viewer – CSS"),
    ("viewer/viewer.js", "Participant Pass Viewer – JavaScript"),

    # Email Service
    ("email-template.gs", "Email Distribution Service (Google Apps Script)"),
]

# Output screens (placeholders for user to insert images later)
OUTPUT_SCREENS = [
    "Landing Page",
    "Organizer Login Page",
    "Organizer Dashboard – Event Creation",
    "Event Management – Participant List",
    "Event Management – Access Point Configuration",
    "Staff Scanner Login",
    "QR Code Scanner Interface",
    "Participant Digital Pass (Viewer)",
    "Email Token Distribution",
]


# ─── Helpers ───

def set_cell_shading(cell, color_hex):
    """Apply background shading to a table cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def add_styled_paragraph(doc, text, font_name="Calibri", font_size=11,
                         bold=False, color=None, alignment=None,
                         space_before=0, space_after=6, line_spacing=1.15):
    """Add a paragraph with consistent styling."""
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(font_size)
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)

    fmt = para.paragraph_format
    fmt.space_before = Pt(space_before)
    fmt.space_after = Pt(space_after)
    fmt.line_spacing = line_spacing
    if alignment is not None:
        fmt.alignment = alignment

    return para


def add_horizontal_line(doc):
    """Add a visual horizontal separator."""
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(4)
    para.paragraph_format.space_after = Pt(4)
    pPr = para._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'  <w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/>'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)


def add_page_border(section):
    """Add a decorative page border to a section."""
    sectPr = section._sectPr
    pgBorders = parse_xml(
        f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
        f'  <w:top w:val="single" w:sz="12" w:space="24" w:color="6A11CB"/>'
        f'  <w:left w:val="single" w:sz="12" w:space="24" w:color="6A11CB"/>'
        f'  <w:bottom w:val="single" w:sz="12" w:space="24" w:color="6A11CB"/>'
        f'  <w:right w:val="single" w:sz="12" w:space="24" w:color="6A11CB"/>'
        f'</w:pgBorders>'
    )
    sectPr.append(pgBorders)


# ─── Document Generator ───

def generate_report():
    doc = Document()

    # Set default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    # Set narrow margins
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)

    # ════════════════════════════════════════
    #  SECTION 1: TITLE PAGE
    # ════════════════════════════════════════

    # Add spacing before title
    for _ in range(6):
        doc.add_paragraph()

    # Title
    add_styled_paragraph(
        doc, TITLE,
        font_size=22, bold=True,
        color=(0x6A, 0x11, 0xCB),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_after=12
    )

    # Subtitle
    add_styled_paragraph(
        doc, SUBTITLE,
        font_size=16, bold=True,
        color=(0x47, 0x55, 0x69),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_after=8
    )

    add_horizontal_line(doc)

    # Course Info
    add_styled_paragraph(
        doc, COURSE,
        font_size=13, bold=False,
        color=(0x64, 0x74, 0x8B),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=12, space_after=4
    )
    add_styled_paragraph(
        doc, SUBJECT,
        font_size=13, bold=False,
        color=(0x64, 0x74, 0x8B),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_after=24
    )

    # Team Member Table
    table = doc.add_table(rows=1 + len(TEAM_MEMBERS), cols=3)
    table.style = 'Table Grid'
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Header row
    headers = ["S.No.", "Name", "Reg. No."]
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_shading(cell, "6A11CB")

    # Data rows
    for idx, member in enumerate(TEAM_MEMBERS):
        row = table.rows[idx + 1]
        cells_data = [str(idx + 1), member["name"], member["regno"]]
        for i, val in enumerate(cells_data):
            cell = row.cells[i]
            cell.text = ""
            run = cell.paragraphs[0].add_run(val)
            run.font.size = Pt(11)
            run.bold = (i == 1)
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Set column widths
    for row in table.rows:
        row.cells[0].width = Cm(2)
        row.cells[1].width = Cm(8)
        row.cells[2].width = Cm(5)

    # Date
    from datetime import datetime
    add_styled_paragraph(
        doc, f"\nDate: {datetime.now().strftime('%B %d, %Y')}",
        font_size=11,
        color=(0x94, 0xA3, 0xB8),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=24
    )

    # Page break after title page
    doc.add_page_break()

    # ════════════════════════════════════════
    #  SECTION 2: PROJECT EXPLANATION
    # ════════════════════════════════════════

    add_styled_paragraph(
        doc, "1. Project Overview",
        font_size=16, bold=True,
        color=(0x6A, 0x11, 0xCB),
        space_before=0, space_after=12
    )

    add_horizontal_line(doc)

    explanation = (
        "PassTrack is a modern, real-time event management platform designed for generating, "
        "distributing, and validating secure digital access tokens via QR codes. The system "
        "provides a complete ecosystem for event organizers to create events with configurable "
        "multi-point access control, import participants through Excel/CSV, and broadcast "
        "personalized digital authorization vouchers via email. Staff members authenticate "
        "using event-specific credentials and validate participant access in real-time through "
        "a mobile-optimized QR scanner that enforces station-specific permissions, time-window "
        "constraints, and duplicate-scan prevention. Participants receive a unique digital pass "
        "link that displays their QR code, grouped access-point schedules (Today, Upcoming, Past), "
        "and a commemorative keepsake view after the event concludes. The entire platform is built "
        "using Vanilla JavaScript, CSS3 with modern design patterns (glassmorphism, micro-animations, "
        "responsive layouts), Firebase Firestore for real-time database synchronization, Firebase "
        "Authentication for organizer login, Google Apps Script for serverless email distribution, "
        "and is deployed on Netlify with automatic GitHub CI/CD. The architecture follows a modular "
        "structure with distinct modules for authentication, organizer dashboards, staff scanners, "
        "and participant viewers, ensuring separation of concerns and maintainability."
    )

    para = doc.add_paragraph()
    run = para.add_run(explanation)
    run.font.name = 'Calibri'
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    para.paragraph_format.line_spacing = 1.5
    para.paragraph_format.space_after = Pt(6)
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # Tech Stack Table
    add_styled_paragraph(
        doc, "\nTechnology Stack",
        font_size=13, bold=True,
        color=(0x47, 0x55, 0x69),
        space_after=8
    )

    tech_data = [
        ("Frontend", "Vanilla JavaScript, HTML5, CSS3"),
        ("Backend / Database", "Firebase Firestore (Real-time NoSQL)"),
        ("Authentication", "Firebase Authentication (Google OAuth)"),
        ("Email Service", "Google Apps Script (Serverless)"),
        ("QR Generation", "qrcode.js Library"),
        ("QR Scanning", "html5-qrcode Library"),
        ("Icons", "Phosphor Icons"),
        ("Hosting", "Netlify (Auto-deploy from GitHub)"),
    ]

    tech_table = doc.add_table(rows=len(tech_data) + 1, cols=2)
    tech_table.style = 'Table Grid'

    # Header
    for i, h in enumerate(["Layer", "Technology"]):
        cell = tech_table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(cell, "475569")

    # Data
    for idx, (layer, tech) in enumerate(tech_data):
        row = tech_table.rows[idx + 1]
        for i, val in enumerate([layer, tech]):
            cell = row.cells[i]
            cell.text = ""
            run = cell.paragraphs[0].add_run(val)
            run.font.size = Pt(10)
            run.bold = (i == 0)
            if idx % 2 == 0:
                set_cell_shading(cell, "F8FAFC")

    tech_table.rows[0].cells[0].width = Cm(5)
    tech_table.rows[0].cells[1].width = Cm(11)

    doc.add_page_break()

    # ════════════════════════════════════════
    #  SECTION 2: OUTPUT SCREENSHOTS (Placeholder)
    # ════════════════════════════════════════

    add_styled_paragraph(
        doc, "2. Output Screenshots",
        font_size=16, bold=True,
        color=(0x6A, 0x11, 0xCB),
        space_before=0, space_after=12
    )

    add_horizontal_line(doc)

    for idx, screen_name in enumerate(OUTPUT_SCREENS, 1):
        # Screen label
        add_styled_paragraph(
            doc, f"2.{idx}  {screen_name}",
            font_size=12, bold=True,
            color=(0x1E, 0x29, 0x3B),
            space_before=12, space_after=8
        )

        # Empty space for pasting screenshot
        placeholder = doc.add_paragraph()
        placeholder_run = placeholder.add_run(
            "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
        )
        placeholder_run.font.size = Pt(11)
        placeholder.paragraph_format.space_after = Pt(6)

        # Caption
        cap = doc.add_paragraph()
        cap_run = cap.add_run(f"Figure 2.{idx}: {screen_name}")
        cap_run.font.size = Pt(9)
        cap_run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
        cap_run.italic = True
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.space_after = Pt(16)

    doc.add_page_break()

    # ════════════════════════════════════════
    #  SECTION 3: SOURCE CODE
    # ════════════════════════════════════════

    add_styled_paragraph(
        doc, "3. Source Code",
        font_size=16, bold=True,
        color=(0x6A, 0x11, 0xCB),
        space_before=0, space_after=12
    )

    add_horizontal_line(doc)

    file_counter = 0
    for rel_path, label in CODE_FILES:
        full_path = os.path.join(PROJECT_DIR, rel_path.replace("/", os.sep))
        if not os.path.exists(full_path):
            print(f"  [SKIP] File not found: {rel_path}")
            continue

        file_counter += 1

        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            code_content = f.read()

        # File header
        add_styled_paragraph(
            doc, f"3.{file_counter}  {label}",
            font_size=12, bold=True,
            color=(0x1E, 0x29, 0x3B),
            space_before=16, space_after=4
        )

        # File path badge
        path_para = doc.add_paragraph()
        path_run = path_para.add_run(f"📁  {rel_path}")
        path_run.font.name = "Consolas"
        path_run.font.size = Pt(9)
        path_run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
        path_run.italic = True
        path_para.paragraph_format.space_after = Pt(6)

        # Code block with monospace font and light background
        code_para = doc.add_paragraph()
        code_run = code_para.add_run(code_content)
        code_run.font.name = "Consolas"
        code_run.font.size = Pt(7)
        code_run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

        # Style the code paragraph
        code_para.paragraph_format.space_before = Pt(2)
        code_para.paragraph_format.space_after = Pt(8)
        code_para.paragraph_format.line_spacing = 1.0

        # Apply light gray background shading to the code paragraph
        pPr = code_para._p.get_or_add_pPr()
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F1F5F9"/>')
        pPr.append(shading)

        # Add thin border around code block
        pBdr = parse_xml(
            f'<w:pBdr {nsdecls("w")}>'
            f'  <w:top w:val="single" w:sz="4" w:space="4" w:color="E2E8F0"/>'
            f'  <w:left w:val="single" w:sz="4" w:space="4" w:color="E2E8F0"/>'
            f'  <w:bottom w:val="single" w:sz="4" w:space="4" w:color="E2E8F0"/>'
            f'  <w:right w:val="single" w:sz="4" w:space="4" w:color="E2E8F0"/>'
            f'</w:pBdr>'
        )
        pPr.append(pBdr)

        add_horizontal_line(doc)

    doc.add_page_break()

    # ════════════════════════════════════════
    #  FOOTER / END PAGE
    # ════════════════════════════════════════

    for _ in range(8):
        doc.add_paragraph()

    add_styled_paragraph(
        doc, "— End of Report —",
        font_size=14, bold=True,
        color=(0x6A, 0x11, 0xCB),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_after=12
    )

    add_styled_paragraph(
        doc, "PassTrack – Secure Digital Token Distribution & QR-Based Access Control",
        font_size=10, bold=False,
        color=(0x94, 0xA3, 0xB8),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_after=4
    )

    add_styled_paragraph(
        doc, "Designed & Developed by Team ByteSmiths for Odoo",
        font_size=10, bold=True,
        color=(0x64, 0x74, 0x8B),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
        space_after=4
    )

    add_styled_paragraph(
        doc, "© 2026 PassTrack Security Ecosystem. All rights reserved.",
        font_size=9, bold=False,
        color=(0x94, 0xA3, 0xB8),
        alignment=WD_ALIGN_PARAGRAPH.CENTER,
    )

    # ═══ ADD PAGE BORDERS TO ALL SECTIONS ═══
    for section in doc.sections:
        add_page_border(section)

    # ═══ SAVE ═══
    doc.save(OUTPUT_FILE)
    print(f"\n{'='*60}")
    print(f"  Report generated successfully!")
    print(f"  File: {OUTPUT_FILE}")
    print(f"  Total code files included: {file_counter}")
    print(f"  Output placeholders: {len(OUTPUT_SCREENS)}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    generate_report()
