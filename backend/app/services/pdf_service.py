from io import BytesIO
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from app.utils.logger import get_logger

logger = get_logger("app.services.pdf_service")


class ClinicalPDFGenerator:
    """Production-grade PDF report generator for MediGuard V2 clinical findings."""

    def __init__(self):
        # Define color scheme
        self.PRIMARY_BLUE = HexColor("#1a3a5c")
        self.ACCENT_TEAL = HexColor("#0d7377")
        self.ALERT_RED = HexColor("#c0392b")
        self.ALERT_AMBER = HexColor("#d35400")
        self.TEXT_DARK = HexColor("#2c3e50")
        self.BG_LIGHT = HexColor("#f8f9fa")
        self.BORDER_GRAY = HexColor("#bdc3c7")

        # Register custom paragraph styles
        self.styles = getSampleStyleSheet()

        self.ReportTitle = ParagraphStyle(
            'ReportTitle',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=self.PRIMARY_BLUE,
            alignment=TA_CENTER,
            spaceAfter=12
        )
        self.SectionHeader = ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=15,
            textColor=self.PRIMARY_BLUE,
            spaceBefore=10,
            spaceAfter=5,
            keepWithNext=True
        )
        self.SubHeader = ParagraphStyle(
            'SubHeader',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            textColor=self.ACCENT_TEAL,
            spaceBefore=6,
            spaceAfter=3,
            keepWithNext=True
        )
        self.BodyText = ParagraphStyle(
            'BodyText',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=self.TEXT_DARK,
            spaceAfter=4
        )
        self.ClinicalNote = ParagraphStyle(
            'ClinicalNote',
            parent=self.styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9,
            leading=13,
            textColor=self.TEXT_DARK,
            spaceAfter=4
        )
        self.Disclaimer = ParagraphStyle(
            'Disclaimer',
            parent=self.styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=7.5,
            leading=10,
            textColor=HexColor("#7f8c8d"),
            spaceAfter=3
        )
        self.TableHeader = ParagraphStyle(
            'TableHeader',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=TA_LEFT
        )
        self.TableCell = ParagraphStyle(
            'TableCell',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=self.TEXT_DARK,
            alignment=TA_LEFT
        )

        # Safely add styles to avoid name collisions
        for s in [self.ReportTitle, self.SectionHeader, self.SubHeader, self.BodyText, self.ClinicalNote, self.Disclaimer, self.TableHeader, self.TableCell]:
            if s.name not in self.styles:
                self.styles.add(s)

    def generate_urgency_badge(self, urgency: str) -> Paragraph:
        """Returns a styled paragraph acting as a colored urgency badge."""
        urgency_lower = urgency.lower().strip()
        if urgency_lower == 'critical':
            bg = self.ALERT_RED
        elif urgency_lower == 'high':
            bg = self.ALERT_AMBER
        elif urgency_lower == 'medium':
            bg = HexColor("#f39c12")
        else:
            bg = HexColor("#27ae60")

        badge_style = ParagraphStyle(
            'UrgencyBadgeStyle',
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=13,
            textColor=colors.white,
            backColor=bg,
            borderPadding=5,
            alignment=TA_CENTER
        )
        return Paragraph(f"URGENCY LEVEL: {urgency.upper()}", badge_style)

    def _build_ddx_table(self, ddx_list: List[Dict[str, Any]]) -> Table:
        """Builds the formatted differential diagnosis table with alternating row colors."""
        header = [
            Paragraph("<b>Rank</b>", self.TableHeader),
            Paragraph("<b>Diagnosis</b>", self.TableHeader),
            Paragraph("<b>ICD-10</b>", self.TableHeader),
            Paragraph("<b>Confidence</b>", self.TableHeader),
            Paragraph("<b>Urgency</b>", self.TableHeader)
        ]

        data = [header]

        for i, entry in enumerate(ddx_list):
            rank = entry.get('rank', i + 1)
            diagnosis = entry.get('diagnosis', 'N/A')
            icd10 = entry.get('icd10_code', entry.get('icd_10', 'N/A'))

            conf_val = entry.get('confidence', 0.0)
            if conf_val <= 1.0:
                conf = f"{int(conf_val * 100)}%"
            else:
                conf = f"{int(conf_val)}%"

            urgency = entry.get('urgency', 'N/A').capitalize()
            reasoning = entry.get('clinical_reasoning', '')

            diag_cell_text = f"<b>{diagnosis}</b>"
            if reasoning:
                diag_cell_text += f"<br/><font size=7 color='#555555'>{reasoning}</font>"

            row = [
                Paragraph(str(rank), self.TableCell),
                Paragraph(diag_cell_text, self.TableCell),
                Paragraph(icd10, self.TableCell),
                Paragraph(conf, self.TableCell),
                Paragraph(urgency, self.TableCell)
            ]
            data.append(row)

        t = Table(data, colWidths=[40, 240, 70, 90, 100])

        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), self.PRIMARY_BLUE),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]

        for idx in range(1, len(data)):
            if idx == 1:
                # Highlight top diagnosis with light teal background
                t_style.append(('BACKGROUND', (0, idx), (-1, idx), HexColor("#e4f3f3")))
            else:
                if idx % 2 == 0:
                    t_style.append(('BACKGROUND', (0, idx), (-1, idx), self.BG_LIGHT))

        t.setStyle(TableStyle(t_style))
        return t

    def _build_drug_table(self, interactions: List[Dict[str, Any]]) -> Table:
        """Builds the drug interaction table with severity coloring."""
        header = [
            Paragraph("<b>Drug A</b>", self.TableHeader),
            Paragraph("<b>Drug B</b>", self.TableHeader),
            Paragraph("<b>Severity</b>", self.TableHeader),
            Paragraph("<b>Management</b>", self.TableHeader)
        ]

        data = [header]

        severity_colors = {
            'mild': '#27ae60',
            'moderate': '#d35400',
            'severe': '#c0392b',
            'contraindicated': '#7f0000',
            'high': '#c0392b',
            'medium': '#d35400',
            'low': '#27ae60'
        }

        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), self.PRIMARY_BLUE),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]

        for idx, item in enumerate(interactions):
            drug_a = item.get('drug_a', item.get('drug_A', 'N/A'))
            drug_b = item.get('drug_b', item.get('drug_B', 'N/A'))
            sev = item.get('severity', 'N/A')
            mgmt = item.get('management', 'N/A')

            sev_lower = sev.lower().strip()
            sev_color = severity_colors.get(sev_lower, self.TEXT_DARK.hexval())

            sev_style = ParagraphStyle(
                f'SevStyle_{idx}',
                parent=self.TableCell,
                fontName='Helvetica-Bold',
                textColor=HexColor(sev_color)
            )

            row = [
                Paragraph(drug_a, self.TableCell),
                Paragraph(drug_b, self.TableCell),
                Paragraph(sev.upper(), sev_style),
                Paragraph(mgmt, self.TableCell)
            ]
            data.append(row)

            if (idx + 1) % 2 == 0:
                t_style.append(('BACKGROUND', (0, idx + 1), (-1, idx + 1), self.BG_LIGHT))

        t = Table(data, colWidths=[110, 110, 110, 210])
        t.setStyle(TableStyle(t_style))
        return t

    def _add_section_header(self, text: str, elements: List[Any]):
        """Helper to append a consistent visual divider and section header."""
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(text, self.SectionHeader))
        hr = Table([['']], colWidths=[540], rowHeights=[1.5])
        hr.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.PRIMARY_BLUE),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(hr)
        elements.append(Spacer(1, 6))

    def _draw_decorations(self, canvas, doc):
        """Draws premium visual styling, borders, page numbers, high-fidelity faint ECG grid, and watermarks."""
        canvas.saveState()
        
        # 1. ECG clinical background high-fidelity faint pink grid (5pt intervals, like standard 1mm ECG grid paper)
        canvas.setStrokeColor(HexColor("#faf2f2"))
        canvas.setLineWidth(0.2)
        for y in range(0, 792, 5):
            canvas.line(0, y, 612, y)
        for x in range(0, 612, 5):
            canvas.line(x, 0, x, 792)

        # 2. Major gridlines at 25pt intervals for structured clinical feel
        canvas.setStrokeColor(HexColor("#f4dede"))
        canvas.setLineWidth(0.4)
        for y in range(0, 792, 25):
            canvas.line(0, y, 612, y)
        for x in range(0, 612, 25):
            canvas.line(x, 0, x, 792)

        # 3. Top visual color strip
        canvas.setFillColor(self.PRIMARY_BLUE)
        canvas.rect(0, 782, 612, 10, fill=True, stroke=False)
        
        # 4. Bottom visual color strip
        canvas.rect(0, 0, 612, 15, fill=True, stroke=False)
        
        # 5. Footer branding text
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.white)
        canvas.drawString(36, 4, "CONFIDENTIAL — MEDIGUARD V2 CLINICAL DECISION SUPPORT REPORT")
        
        # 6. Page numbering
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(576, 4, f"Page {doc.page}")
        
        # 7. Rotated confidentiality watermark
        canvas.setFont("Helvetica-Bold", 32)
        canvas.setFillColor(HexColor("#edeef0"))
        canvas.saveState()
        canvas.translate(306, 396)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, "CONFIDENTIAL CLINICAL REPORT")
        canvas.drawCentredString(0, -40, "DO NOT DUPLICATE")
        canvas.restoreState()
        
        canvas.restoreState()

    def generate_pdf(
        self,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        session_id: str
    ) -> bytes:
        """Builds a complete clinical decision support PDF report in memory."""
        logger.info("Starting clinical PDF compilation...", session_id=session_id)
        
        # BytesIO for building PDF in-memory
        buffer = BytesIO()
        
        # Doc template, margins are 36pt (0.5 inch)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=46,
            bottomMargin=36
        )
        
        elements = []
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # ==========================================
        # SECTION 1 — HEADER
        # ==========================================
        header_data = [
            [
                Paragraph("<b>MEDIGUARD V2</b>", ParagraphStyle('LogoStyle', parent=self.styles['Normal'], fontName='Helvetica-Bold', fontSize=13, textColor=self.ACCENT_TEAL, leading=15)),
                Paragraph(f"<b>Session ID:</b> {session_id}<br/><b>Generated:</b> {timestamp}<br/><b>CONFIDENTIALITY:</b> Strict Medical Privilege", ParagraphStyle('MetaStyle', parent=self.styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, textColor=HexColor("#7f8c8d"), alignment=TA_RIGHT))
            ]
        ]
        header_table = Table(header_data, colWidths=[200, 340])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_table)
        elements.append(Paragraph("CLINICAL DECISION SUPPORT REPORT", self.ReportTitle))
        
        # Divider line
        hr1 = Table([['']], colWidths=[540], rowHeights=[1.5])
        hr1.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.PRIMARY_BLUE),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(hr1)
        elements.append(Spacer(1, 8))

        # ==========================================
        # SECTION 2 — PATIENT INFORMATION
        # ==========================================
        pat_left = f"""
        <b>Patient Name:</b> {patient_data.get('patient_name', 'Unknown')}<br/>
        <b>Age / Gender:</b> {patient_data.get('age', 'N/A')} y/o | {str(patient_data.get('gender', 'N/A')).capitalize()}<br/>
        <b>Chief Complaint:</b> {patient_data.get('chief_complaint', 'None')}
        """
        
        vitals = patient_data.get('vitals', {}) or {}
        vitals_list = []
        if vitals.get('bp'):
            vitals_list.append(f"• <b>BP:</b> {vitals.get('bp')} mmHg")
        if vitals.get('heart_rate'):
            vitals_list.append(f"• <b>HR:</b> {vitals.get('heart_rate')} bpm")
        if vitals.get('temperature'):
            vitals_list.append(f"• <b>Temp:</b> {vitals.get('temperature')} °C")
        if vitals.get('spo2'):
            vitals_list.append(f"• <b>SpO2:</b> {vitals.get('spo2')}%")
        if vitals.get('weight'):
            vitals_list.append(f"• <b>Weight:</b> {vitals.get('weight')} kg")
        if vitals.get('height'):
            vitals_list.append(f"• <b>Height:</b> {vitals.get('height')} cm")

        if not vitals_list:
            pat_right = "<b>Clinical Vitals:</b><br/>No physiological vitals recorded."
        else:
            pat_right = "<b>Clinical Vitals:</b><br/>" + "<br/>".join(vitals_list)

        pat_table = Table([[Paragraph(pat_left, self.BodyText), Paragraph(pat_right, self.BodyText)]], colWidths=[270, 270])
        pat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(pat_table)
        elements.append(Spacer(1, 8))

        # ==========================================
        # SECTION 3 — URGENCY ASSESSMENT
        # ==========================================
        urgency_val = report_data.get('urgency_level', 'low')
        badge = self.generate_urgency_badge(urgency_val)
        assessment_text = report_data.get('urgency_assessment', 'No assessment provided.')

        # Sub-layout: small Table inside elements to keep badge size tightly bounded
        urg_badge_table = Table([[badge]], colWidths=[160])
        urg_badge_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

        urgency_table = Table([[urg_badge_table, Paragraph(assessment_text, self.BodyText)]], colWidths=[175, 365])
        urgency_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(urgency_table)

        # ==========================================
        # SECTION 4 — EXECUTIVE SUMMARY
        # ==========================================
        self._add_section_header("EXECUTIVE SUMMARY", elements)
        
        exec_summary = report_data.get('executive_summary', '')
        if exec_summary:
            elements.append(Paragraph(exec_summary, self.BodyText))
            elements.append(Spacer(1, 4))
            
        clinical_narrative = report_data.get('clinical_narrative', '')
        if clinical_narrative:
            elements.append(Paragraph(clinical_narrative, self.ClinicalNote))

        # ==========================================
        # SECTION 5 — DIFFERENTIAL DIAGNOSIS
        # ==========================================
        self._add_section_header("DIFFERENTIAL DIAGNOSIS", elements)
        
        ddx_list = report_data.get('differential_diagnosis', [])
        if ddx_list:
            elements.append(self._build_ddx_table(ddx_list))
            elements.append(Spacer(1, 6))
            
        diff_summary = report_data.get('differential_summary', '')
        if diff_summary:
            elements.append(Paragraph(diff_summary, self.BodyText))

        # ==========================================
        # SECTION 6 — RECOMMENDED WORKUP
        # ==========================================
        self._add_section_header("RECOMMENDED WORKUP", elements)
        
        workup_items = report_data.get('recommended_workup', report_data.get('recommended_tests', []))
        if workup_items:
            for idx, item in enumerate(workup_items):
                elements.append(Paragraph(f"<b>{idx+1}.</b> {item}", self.BodyText))
        else:
            elements.append(Paragraph("No recommended diagnostic tests or workup provided.", self.BodyText))

        # ==========================================
        # SECTION 7 — MEDICATION & DRUG INTERACTION ANALYSIS
        # ==========================================
        self._add_section_header("MEDICATION & DRUG INTERACTION ANALYSIS", elements)
        
        interactions = report_data.get('drug_interactions', [])
        if not interactions:
            no_int_table = Table([[Paragraph("<b>✔ No significant drug-drug or drug-allergy interactions identified.</b>", ParagraphStyle('GreenText', parent=self.BodyText, textColor=HexColor("#27ae60")))]], colWidths=[540])
            no_int_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), HexColor("#e8f8f5")),
                ('BOX', (0, 0), (-1, -1), 0.5, HexColor("#27ae60")),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_int_table)
            elements.append(Spacer(1, 6))
        else:
            elements.append(self._build_drug_table(interactions))
            elements.append(Spacer(1, 6))

        med_notes = report_data.get('medication_notes', '')
        if med_notes:
            elements.append(Paragraph(med_notes, self.BodyText))
            elements.append(Spacer(1, 6))

        contraindications = report_data.get('contraindications', [])
        if contraindications:
            contra_bullets = "".join([f"• {c}<br/>" for c in contraindications])
            contra_table = Table([[Paragraph(f"<b>⚠ CONTRAINDICATIONS / WARNING LABELS IDENTIFIED</b><br/>{contra_bullets}", ParagraphStyle('RedText', parent=self.BodyText, textColor=self.ALERT_RED))]], colWidths=[540])
            contra_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), HexColor("#fdf2f2")),
                ('BOX', (0, 0), (-1, -1), 0.5, self.ALERT_RED),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(contra_table)
            elements.append(Spacer(1, 6))

        # ==========================================
        # SECTION 8 — DISPOSITION & FOLLOW-UP
        # ==========================================
        self._add_section_header("DISPOSITION & FOLLOW-UP", elements)
        
        disp = report_data.get('disposition_recommendation', 'No disposition listed.')
        disp_table = Table([[Paragraph(f"<b>Recommended Clinical Disposition:</b> {disp}", ParagraphStyle('DispText', parent=self.BodyText, textColor=self.PRIMARY_BLUE))]], colWidths=[540])
        disp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor("#ebf5fb")),
            ('BOX', (0, 0), (-1, -1), 0.5, self.PRIMARY_BLUE),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(disp_table)
        elements.append(Spacer(1, 6))

        follow_ups = report_data.get('follow_up_instructions', [])
        if follow_ups:
            elements.append(Paragraph("<b>Standard Follow-Up Protocol:</b>", self.SubHeader))
            for idx, inst in enumerate(follow_ups):
                elements.append(Paragraph(f"<b>{idx+1}.</b> {inst}", self.BodyText))

        # ==========================================
        # SECTION 9 — REPORT METADATA
        # ==========================================
        self._add_section_header("REPORT METADATA", elements)
        
        meta = report_data.get('report_metadata', {})
        agents = ", ".join(meta.get('agents_used', []))
        dur = f"{meta.get('generation_time_seconds', 'N/A')} seconds"
        model = meta.get('model_used', 'N/A')
        rag_src = str(meta.get('rag_sources_count', 'N/A'))

        meta_table_data = [
            [Paragraph("<b>Clinical AI Specialists Run:</b>", self.TableCell), Paragraph(agents, self.TableCell)],
            [Paragraph("<b>Orchestration LLM Platform:</b>", self.TableCell), Paragraph(model, self.TableCell)],
            [Paragraph("<b>Indexed Medical RAG Sources:</b>", self.TableCell), Paragraph(f"{rag_src} sources", self.TableCell)],
            [Paragraph("<b>Workflow Compilation Duration:</b>", self.TableCell), Paragraph(dur, self.TableCell)],
        ]
        meta_table = Table(meta_table_data, colWidths=[180, 360])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(meta_table)

        # ==========================================
        # SECTION 10 — CLINICAL DISCLAIMERS
        # ==========================================
        self._add_section_header("CLINICAL DISCLAIMERS", elements)
        
        disclaimers = report_data.get('clinical_disclaimers', [])
        bullet_text = "".join([f"• <i>{d}</i><br/>" for d in disclaimers])
        bullet_text += f"<br/><b>Report ID:</b> {session_id} | <b>Generated:</b> {timestamp}"

        disclaimer_table = Table([[Paragraph(bullet_text, self.Disclaimer)]], colWidths=[540])
        disclaimer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor("#f2f4f4")),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(disclaimer_table)

        # Build PDF document with custom visual background canvas templates
        doc.build(
            elements,
            onFirstPage=self._draw_decorations,
            onLaterPages=self._draw_decorations
        )
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        logger.info("Clinical PDF compilation complete.", pdf_size=len(pdf_bytes))
        return pdf_bytes
