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
        """Builds the differential diagnosis table."""
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

    def _draw_ecg_grid(self, canvas):
        """Draws a faint medical ECG grid background onto the canvas."""
        canvas.setStrokeColor(HexColor("#faf2f2"))
        canvas.setLineWidth(0.2)
        for y in range(0, 792, 5):
            canvas.line(0, y, 612, y)
        for x in range(0, 612, 5):
            canvas.line(x, 0, x, 792)

        canvas.setStrokeColor(HexColor("#f4dede"))
        canvas.setLineWidth(0.4)
        for y in range(0, 792, 25):
            canvas.line(0, y, 612, y)
        for x in range(0, 612, 25):
            canvas.line(x, 0, x, 792)

    def _draw_decorations(self, canvas, doc):
        """Standard visual decorators for the Physician Clinical Report."""
        canvas.saveState()
        self._draw_ecg_grid(canvas)

        # Header and footer bars
        canvas.setFillColor(self.PRIMARY_BLUE)
        canvas.rect(0, 782, 612, 10, fill=True, stroke=False)
        canvas.rect(0, 0, 612, 15, fill=True, stroke=False)

        # Footer labels
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.white)
        canvas.drawString(36, 4, "CONFIDENTIAL — PHYSICIAN COPY (MEDIGUARD CDSS)")
        canvas.drawRightString(576, 4, f"Page {doc.page}")

        # Confidential Watermark
        canvas.setFont("Helvetica-Bold", 32)
        canvas.setFillColor(HexColor("#edeef0"))
        canvas.saveState()
        canvas.translate(306, 396)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, "CONFIDENTIAL CLINICAL REPORT")
        canvas.drawCentredString(0, -40, "DO NOT DUPLICATE")
        canvas.restoreState()

        canvas.restoreState()

    def _draw_patient_decorations(self, canvas, doc):
        """Decorations customized for patient summary PDFs (gentler tone)."""
        canvas.saveState()
        self._draw_ecg_grid(canvas)

        # Gentler teal striping
        canvas.setFillColor(self.ACCENT_TEAL)
        canvas.rect(0, 782, 612, 10, fill=True, stroke=False)
        canvas.rect(0, 0, 612, 15, fill=True, stroke=False)

        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.white)
        canvas.drawString(36, 4, "YOUR PERSONAL HEALTH SUMMARY")
        canvas.drawRightString(576, 4, f"Page {doc.page}")
        canvas.restoreState()

    def _draw_referral_decorations(self, canvas, doc):
        """Decorations customized for referral letters (academic/formal layout)."""
        canvas.saveState()
        self._draw_ecg_grid(canvas)

        # Professional navy striping
        canvas.setFillColor(self.PRIMARY_BLUE)
        canvas.rect(0, 782, 612, 6, fill=True, stroke=False)
        canvas.rect(0, 0, 612, 15, fill=True, stroke=False)

        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.white)
        canvas.drawString(36, 4, "CLINICAL SPECIALIST REFERRAL LETTER")
        canvas.drawRightString(576, 4, f"Page {doc.page}")
        canvas.restoreState()

    def _draw_discharge_decorations(self, canvas, doc):
        """Decorations customized for hospital discharge documentation."""
        canvas.saveState()
        self._draw_ecg_grid(canvas)

        canvas.setFillColor(self.PRIMARY_BLUE)
        canvas.rect(0, 782, 612, 10, fill=True, stroke=False)
        canvas.rect(0, 0, 612, 15, fill=True, stroke=False)

        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.white)
        canvas.drawString(36, 4, "OFFICIAL HOSPITAL DISCHARGE SUMMARY")
        canvas.drawRightString(576, 4, f"Page {doc.page}")
        canvas.restoreState()

    # ─────────────────────────────────────────────────────────────────────────
    # DOCUMENT 1: Enhanced Full Clinical Report
    # ─────────────────────────────────────────────────────────────────────────
    def generate_pdf(
        self,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        session_id: str,
        staff_name: str = "Clinical Staff",
        institution_name: str = "Hospital/Clinic"
    ) -> bytes:
        """Builds a complete clinical decision support PDF report in memory."""
        logger.info("Starting full clinical PDF compilation...", session_id=session_id)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=46, bottomMargin=36)
        elements = []
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Header
        header_data = [
            [
                Paragraph(f"<b>{institution_name.upper()}</b>", ParagraphStyle('LogoStyle', parent=self.styles['Normal'], fontName='Helvetica-Bold', fontSize=13, textColor=self.ACCENT_TEAL, leading=15)),
                Paragraph(f"<b>Staff Ref:</b> {staff_name}<br/><b>Session:</b> {session_id}<br/><b>Date:</b> {timestamp}", ParagraphStyle('MetaStyle', parent=self.styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, textColor=HexColor("#7f8c8d"), alignment=TA_RIGHT))
            ]
        ]
        header_table = Table(header_data, colWidths=[240, 300])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_table)
        elements.append(Paragraph("CONFIDENTIAL — PHYSICIAN COPY", self.ReportTitle))
        
        # Divider line
        hr1 = Table([['']], colWidths=[540], rowHeights=[1.5])
        hr1.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.PRIMARY_BLUE),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(hr1)
        elements.append(Spacer(1, 8))

        # 2. Patient Demographics & Vitals
        pat_left = f"""
        <b>Patient Name:</b> {patient_data.get('patient_name', 'Unknown')}<br/>
        <b>Age / Gender:</b> {patient_data.get('patient_age', patient_data.get('age', 'N/A'))} y/o | {str(patient_data.get('patient_gender', patient_data.get('gender', 'N/A'))).capitalize()}<br/>
        <b>Chief Complaint:</b> {patient_data.get('chief_complaint', 'None')}
        """
        
        vitals = patient_data.get('vitals', {}) or {}
        vitals_list = []
        if vitals.get('bp'): vitals_list.append(f"• <b>BP:</b> {vitals.get('bp')} mmHg")
        if vitals.get('heart_rate'): vitals_list.append(f"• <b>HR:</b> {vitals.get('heart_rate')} bpm")
        if vitals.get('temperature'): vitals_list.append(f"• <b>Temp:</b> {vitals.get('temperature')} °C")
        if vitals.get('spo2'): vitals_list.append(f"• <b>SpO2:</b> {vitals.get('spo2')}%")
        if vitals.get('weight'): vitals_list.append(f"• <b>Weight:</b> {vitals.get('weight')} kg")
        if vitals.get('height'): vitals_list.append(f"• <b>Height:</b> {vitals.get('height')} cm")

        pat_right = "<b>Clinical Vitals:</b><br/>" + ("<br/>".join(vitals_list) if vitals_list else "No physiological vitals recorded.")

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

        # 3. Urgency
        urgency_val = report_data.get('urgency_level', 'medium')
        badge = self.generate_urgency_badge(urgency_val)
        assessment_text = report_data.get('urgency_assessment', report_data.get('clinical_summary', 'No assessment provided.'))

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

        # 4. Executive Summary
        self._add_section_header("EXECUTIVE SUMMARY", elements)
        exec_summary = report_data.get('executive_summary', '')
        if exec_summary:
            elements.append(Paragraph(exec_summary, self.BodyText))
            elements.append(Spacer(1, 4))
            
        clinical_narrative = report_data.get('clinical_narrative', report_data.get('clinical_summary', ''))
        if clinical_narrative:
            elements.append(Paragraph(clinical_narrative, self.ClinicalNote))

        # 5. DDx Table
        self._add_section_header("DIFFERENTIAL DIAGNOSIS", elements)
        ddx_list = report_data.get('differential_diagnosis', [])
        if ddx_list:
            elements.append(self._build_ddx_table(ddx_list))
            elements.append(Spacer(1, 6))
            
        diff_summary = report_data.get('differential_summary', '')
        if diff_summary:
            elements.append(Paragraph(diff_summary, self.BodyText))

        # 6. Recommended Workup
        self._add_section_header("RECOMMENDED WORKUP", elements)
        workup_items = report_data.get('recommended_workup', report_data.get('recommended_tests', []))
        if workup_items:
            for idx, item in enumerate(workup_items):
                elements.append(Paragraph(f"<b>{idx+1}.</b> {item}", self.BodyText))
        else:
            elements.append(Paragraph("No recommended diagnostic tests or workup provided.", self.BodyText))

        # 7. Medications and Interactions
        self._add_section_header("MEDICATION & DRUG INTERACTION ANALYSIS", elements)
        interactions = report_data.get('drug_interactions', report_data.get('drug_interactions_found', []))
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

        # 8. Follow ups
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

        # 9. Disclaimers
        self._add_section_header("CLINICAL DISCLAIMERS", elements)
        bullet_text = "• <i>This system is a clinical decision support helper. Medical judgment remains the sole responsibility of the clinician.</i><br/>"
        bullet_text += f"<b>Report ID:</b> {session_id} | <b>Ref:</b> {staff_name} | <b>Tenant:</b> {institution_name}"

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

        doc.build(elements, onFirstPage=self._draw_decorations, onLaterPages=self._draw_decorations)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # ─────────────────────────────────────────────────────────────────────────
    # DOCUMENT 2: Patient Summary Report (Plain English, No Scores/Codes)
    # ─────────────────────────────────────────────────────────────────────────
    def generate_patient_summary_pdf(
        self,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        session_id: str,
        staff_name: str,
        institution_name: str
    ) -> bytes:
        """Generates a plain-English PDF takeaway for patients."""
        logger.info("Starting Patient Summary PDF compilation...", session_id=session_id)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=46, bottomMargin=36)
        elements = []
        today_str = datetime.utcnow().strftime("%B %d, %Y")

        # Title / Subtitle
        elements.append(Paragraph("YOUR HEALTH SUMMARY", self.ReportTitle))
        elements.append(Paragraph(f"<b>Prepared by:</b> {institution_name}<br/><b>Physician:</b> {staff_name}<br/><b>Date:</b> {today_str}", self.BodyText))
        elements.append(Spacer(1, 10))

        # Divider
        hr = Table([['']], colWidths=[540], rowHeights=[1.5])
        hr.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), self.ACCENT_TEAL)]))
        elements.append(hr)
        elements.append(Spacer(1, 10))

        # Chief Complaint & Primary Impression
        ddx = report_data.get('differential_diagnosis', [])
        primary_dx = ddx[0].get('diagnosis', 'Assessment Pending') if ddx else 'Assessment Pending'
        
        info_text = f"""
        <b>Patient:</b> {patient_data.get('patient_name', 'Patient')}<br/>
        <b>Reason for Visit:</b> {patient_data.get('chief_complaint', 'Clinical Assessment')}<br/>
        <b>Primary Medical Impression:</b> {primary_dx} (Plain English description)
        """
        elements.append(Paragraph("<b>VISIT OVERVIEW</b>", self.SubHeader))
        elements.append(Paragraph(info_text, self.BodyText))
        elements.append(Spacer(1, 10))

        # Doctor's Recommendations
        elements.append(Paragraph("<b>WHAT WE RECOMMEND</b>", self.SubHeader))
        workups = report_data.get('recommended_workup', report_data.get('recommended_tests', []))
        if workups:
            for idx, item in enumerate(workups):
                elements.append(Paragraph(f"<b>{idx+1}.</b> {item}", self.BodyText))
        else:
            elements.append(Paragraph("Follow standard medical care advice as discussed with your doctor.", self.BodyText))
        elements.append(Spacer(1, 10))

        # Medications reviewed
        elements.append(Paragraph("<b>MEDICATIONS REVIEWED</b>", self.SubHeader))
        meds = patient_data.get('current_medications', [])
        interactions = report_data.get('drug_interactions', report_data.get('drug_interactions_found', []))
        
        if meds:
            for m in meds:
                # Basic mock check if medication is involved in a severe warning
                flagged = any(m.lower() in str(i).lower() for i in interactions)
                status_lbl = "<font color='red'><b>Review with Doctor</b> (Possible warning)</font>" if flagged else "<font color='green'><b>No Warnings Found</b></font>"
                elements.append(Paragraph(f"• {m} — {status_lbl}", self.BodyText))
        else:
            elements.append(Paragraph("No current home medications were reviewed.", self.BodyText))
        elements.append(Spacer(1, 10))

        # Follow up
        elements.append(Paragraph("<b>FOLLOW-UP INSTRUCTIONS</b>", self.SubHeader))
        follow_ups = report_data.get('follow_up_instructions', [])
        if follow_ups:
            for idx, inst in enumerate(follow_ups):
                elements.append(Paragraph(f"<b>{idx+1}.</b> {inst}", self.BodyText))
        else:
            elements.append(Paragraph("1. Contact our clinic if symptoms persist or change.<br/>2. Schedule a routine checkup in 1-2 weeks.", self.BodyText))
        elements.append(Spacer(1, 10))

        # Warning flags / ED guidelines
        elements.append(Paragraph("<b>⚠️ WHEN TO SEEK EMERGENCY CARE</b>", ParagraphStyle('AmberSub', parent=self.SubHeader, textColor=self.ALERT_AMBER)))
        alert_msg = "Please go to the nearest emergency department or dial 911 immediately if you experience sudden chest pain, shortness of breath, severe dizziness, confusion, or weakness."
        elements.append(Paragraph(alert_msg, self.BodyText))
        elements.append(Spacer(1, 15))

        # Clinic Contact placeholder
        elements.append(Paragraph(f"<b>Clinic Contact:</b> For any questions, please call {institution_name} department.", self.ClinicalNote))
        elements.append(Spacer(1, 15))

        # Footer disclaimer
        disc = "<i>This summary was prepared with AI assistance to translate complex charts. Please follow up with your doctor for all medical decisions.</i>"
        elements.append(Paragraph(disc, self.Disclaimer))

        doc.build(elements, onFirstPage=self._draw_patient_decorations, onLaterPages=self._draw_patient_decorations)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # ─────────────────────────────────────────────────────────────────────────
    # DOCUMENT 3: Referral Letter
    # ─────────────────────────────────────────────────────────────────────────
    def generate_referral_letter_pdf(
        self,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        session_id: str,
        referring_staff: Any,  # TokenData or dict
        institution_name: str
    ) -> bytes:
        """Generates a professional clinical referral letter for specialists."""
        logger.info("Starting Referral Letter PDF compilation...", session_id=session_id)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=46, bottomMargin=36)
        elements = []
        today_str = datetime.utcnow().strftime("%B %d, %Y")

        staff_name = referring_staff.full_name if hasattr(referring_staff, 'full_name') else referring_staff.get('full_name', 'Clinical Staff')
        specialization = referring_staff.specialization if hasattr(referring_staff, 'specialization') else referring_staff.get('specialization', 'General Practice')
        patient_name = patient_data.get('patient_name', 'Unknown')
        age = patient_data.get('patient_age', patient_data.get('age', 'N/A'))
        gender = patient_data.get('patient_gender', patient_data.get('gender', 'N/A'))

        # Header Address blocks
        elements.append(Paragraph(f"<b>{institution_name.upper()}</b>", ParagraphStyle('InstName', parent=self.styles['Normal'], fontName='Helvetica-Bold', fontSize=12, textColor=self.PRIMARY_BLUE)))
        elements.append(Paragraph(f"Clinic Referral Service<br/>Date: {today_str}", self.BodyText))
        elements.append(Spacer(1, 15))

        elements.append(Paragraph("<b>TO:</b> Specialist Physician / Care Consultant", self.BodyText))
        elements.append(Paragraph(f"<b>RE:</b> Patient Referral — <b>{patient_name}</b> (Age: {age} | Gender: {gender})", self.BodyText))
        elements.append(Spacer(1, 12))

        # Letter body
        elements.append(Paragraph("Dear Colleague,", self.BodyText))
        elements.append(Spacer(1, 8))
        
        intro = f"I am referring this patient, <b>{patient_name}</b>, a {age}-year-old {gender}, for your specialist evaluation and management."
        elements.append(Paragraph(intro, self.BodyText))
        elements.append(Spacer(1, 10))

        # Referral Reason
        elements.append(Paragraph("<b>REASON FOR REFERRAL:</b>", self.SubHeader))
        elements.append(Paragraph(patient_data.get('chief_complaint', 'Clinical evaluation'), self.BodyText))
        elements.append(Spacer(1, 10))

        # Clinical Summary (First two sentences/paragraphs of clinical narrative)
        narrative = report_data.get('clinical_narrative', report_data.get('clinical_summary', 'Assessment completed.'))
        elements.append(Paragraph("<b>CLINICAL SUMMARY:</b>", self.SubHeader))
        elements.append(Paragraph(narrative, self.ClinicalNote))
        elements.append(Spacer(1, 10))

        # Diagnosis
        ddx = report_data.get('differential_diagnosis', [])
        primary_dx = ddx[0].get('diagnosis', 'Pending') if ddx else 'Pending'
        icd10 = ddx[0].get('icd10_code', ddx[0].get('icd_10', 'N/A')) if ddx else 'N/A'
        
        elements.append(Paragraph("<b>WORKING DIAGNOSIS:</b>", self.SubHeader))
        elements.append(Paragraph(f"{primary_dx} (ICD-10: {icd10})", self.BodyText))
        elements.append(Spacer(1, 10))

        # Top 3 Differential Diagnoses
        elements.append(Paragraph("<b>DIFFERENTIAL DIAGNOSES CONSIDERED:</b>", self.SubHeader))
        for idx, entry in enumerate(ddx[:3]):
            diag = entry.get('diagnosis', 'N/A')
            icd = entry.get('icd10_code', entry.get('icd_10', 'N/A'))
            elements.append(Paragraph(f"• {diag} (ICD-10: {icd})", self.BodyText))
        elements.append(Spacer(1, 10))

        # Medications & Allergies
        meds = ", ".join(patient_data.get('current_medications', [])) or "None listed"
        allergies = ", ".join(patient_data.get('allergies', [])) or "No known allergies"
        elements.append(Paragraph(f"<b>CURRENT MEDICATIONS:</b> {meds}", self.BodyText))
        elements.append(Paragraph(f"<b>ALLERGIES:</b> {allergies}", self.BodyText))
        elements.append(Spacer(1, 10))

        # Investigations pending
        elements.append(Paragraph("<b>INVESTIGATIONS RECOMMENDED / PENDING:</b>", self.SubHeader))
        workups = report_data.get('recommended_workup', report_data.get('recommended_tests', []))
        if workups:
            elements.append(Paragraph(", ".join(workups), self.BodyText))
        else:
            elements.append(Paragraph("No further diagnostics pending.", self.BodyText))
        elements.append(Spacer(1, 15))

        elements.append(Paragraph("Thank you for your assistance with this patient's care. Please review and advise.", self.BodyText))
        elements.append(Spacer(1, 20))

        # Signature
        sig_block = f"""
        Yours sincerely,<br/><br/><br/>
        ___________________________<br/>
        <b>{staff_name}</b><br/>
        {specialization}<br/>
        {institution_name}
        """
        elements.append(Paragraph(sig_block, self.BodyText))

        doc.build(elements, onFirstPage=self._draw_referral_decorations, onLaterPages=self._draw_referral_decorations)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # ─────────────────────────────────────────────────────────────────────────
    # DOCUMENT 4: Discharge Summary
    # ─────────────────────────────────────────────────────────────────────────
    def generate_discharge_summary_pdf(
        self,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        session_id: str,
        staff_name: str,
        institution_name: str
    ) -> bytes:
        """Generates a structured medical Hospital Discharge Summary."""
        logger.info("Starting Discharge Summary PDF compilation...", session_id=session_id)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=46, bottomMargin=36)
        elements = []
        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        # Document title
        elements.append(Paragraph("HOSPITAL DISCHARGE SUMMARY", self.ReportTitle))
        elements.append(Spacer(1, 10))

        # Patient Header
        pat_name = patient_data.get('patient_name', 'Unknown')
        age = patient_data.get('patient_age', patient_data.get('age', 'N/A'))
        gender = patient_data.get('patient_gender', patient_data.get('gender', 'N/A'))
        
        meta_table_data = [
            [Paragraph(f"<b>Patient Name:</b> {pat_name}", self.TableCell), Paragraph(f"<b>Discharge Date:</b> {today_str}", self.TableCell)],
            [Paragraph(f"<b>Age / Sex:</b> {age} / {str(gender).capitalize()}", self.TableCell), Paragraph(f"<b>Attending Clinician:</b> {staff_name}", self.TableCell)],
            [Paragraph(f"<b>Institution:</b> {institution_name}", self.TableCell), Paragraph(f"<b>Session Ref ID:</b> {session_id[:8]}...", self.TableCell)]
        ]
        meta_table = Table(meta_table_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 10))

        # Presenting complaint
        elements.append(Paragraph("<b>1. PRESENTING CHIEF COMPLAINT</b>", self.SubHeader))
        elements.append(Paragraph(patient_data.get('chief_complaint', 'No active complaint registered.'), self.BodyText))
        elements.append(Spacer(1, 8))

        # Assessment / Findings
        elements.append(Paragraph("<b>2. CLINICAL ASSESSMENT FINDINGS</b>", self.SubHeader))
        findings = report_data.get('clinical_narrative', report_data.get('clinical_summary', 'No summary details found.'))
        elements.append(Paragraph(findings, self.ClinicalNote))
        elements.append(Spacer(1, 8))

        # Diagnoses (Primary & Secondary)
        elements.append(Paragraph("<b>3. DISCHARGE DIAGNOSES</b>", self.SubHeader))
        ddx = report_data.get('differential_diagnosis', [])
        if ddx:
            elements.append(Paragraph(f"• <b>Primary:</b> {ddx[0].get('diagnosis')} (ICD-10: {ddx[0].get('icd10_code', ddx[0].get('icd_10', 'N/A'))})", self.BodyText))
            if len(ddx) > 1:
                elements.append(Paragraph(f"• <b>Secondary:</b> {ddx[1].get('diagnosis')} (ICD-10: {ddx[1].get('icd10_code', ddx[1].get('icd_10', 'N/A'))})", self.BodyText))
        else:
            elements.append(Paragraph("Pending formal primary assessment.", self.BodyText))
        elements.append(Spacer(1, 8))

        # Medications & Warnings
        elements.append(Paragraph("<b>4. MEDICATIONS ON DISCHARGE & WARNINGS</b>", self.SubHeader))
        meds = patient_data.get('current_medications', [])
        if meds:
            elements.append(Paragraph(f"Reviewed current medications: {', '.join(meds)}", self.BodyText))
        else:
            elements.append(Paragraph("No home medications prescribed at discharge.", self.BodyText))
        
        # Interactions
        interactions = report_data.get('drug_interactions', report_data.get('drug_interactions_found', []))
        if interactions:
            warnings_text = "<b>⚠️ ALERT: Potential interaction flags identified:</b><br/>"
            for item in interactions:
                warnings_text += f"- {item.get('drug_a')} / {item.get('drug_b')}: {item.get('severity').upper()} ({item.get('management')})<br/>"
            elements.append(Paragraph(warnings_text, ParagraphStyle('WarnStyle', parent=self.BodyText, textColor=self.ALERT_RED)))
        elements.append(Spacer(1, 8))

        # Follow ups & disposition
        elements.append(Paragraph("<b>5. FOLLOW-UP APPOINTMENTS & DISPOSITION</b>", self.SubHeader))
        disp = report_data.get('disposition_recommendation', 'Disposition care review.')
        elements.append(Paragraph(f"<b>Recommended Action Plan:</b> {disp}", self.BodyText))
        follow_ups = report_data.get('follow_up_instructions', [])
        if follow_ups:
            for idx, inst in enumerate(follow_ups):
                elements.append(Paragraph(f"{idx+1}. {inst}", self.BodyText))
        elements.append(Spacer(1, 10))

        # Emergency Instructions
        elements.append(Paragraph("<b>6. RETURN TO EMERGENCY DEPARTMENT DIRECTIONS</b>", ParagraphStyle('EDHead', parent=self.SubHeader, textColor=self.ALERT_RED)))
        elements.append(Paragraph("Return immediately to the nearest Emergency Room if you experience chest tightness, respiratory distress, intractable vomiting, severe uncontrolled bleeding, or sudden speech changes.", self.BodyText))
        elements.append(Spacer(1, 20))

        # Attending Signature block
        sig_block = f"""
        Attending Physician Signature:<br/><br/>
        __________________________________________<br/>
        <b>{staff_name}</b><br/>
        Licensed Medical Representative
        """
        elements.append(Paragraph(sig_block, self.BodyText))

        doc.build(elements, onFirstPage=self._draw_discharge_decorations, onLaterPages=self._draw_discharge_decorations)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
