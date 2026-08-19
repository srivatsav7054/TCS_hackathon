"""PDF text extraction via PyMuPDF + sample PDF generation for testing."""

import pymupdf  # PyMuPDF
import os


def extract_text(pdf_path: str) -> str:
    """Extract all text from a text-based PDF."""
    doc = pymupdf.open(pdf_path)
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def generate_sample_pdfs(output_dir: str = "data/sample_pdfs") -> list[str]:
    """Generate 3 synthetic claim PDFs for testing. Returns list of file paths."""
    os.makedirs(output_dir, exist_ok=True)

    samples = [
        {
            "filename": "auto_collision_claim.pdf",
            "text": (
                "INSURANCE CLAIM FORM\n\n"
                "Claim ID: CLM-2024-001\n"
                "Policy Number: POL-AUTO-55921\n"
                "Claim Type: Auto Collision\n"
                "Date of Incident: 2024-11-15\n"
                "Claim Amount: $12,500.00\n"
                "Policy Limit: $25,000.00\n\n"
                "NARRATIVE:\n"
                "On November 15, 2024, at approximately 3:45 PM, the insured vehicle "
                "(2022 Honda Civic, VIN: 1HGBH41JXMN109186) was involved in a rear-end "
                "collision at the intersection of Main Street and Oak Avenue. The insured "
                "was stopped at a red traffic signal when the at-fault vehicle struck the "
                "rear bumper at estimated 25 mph. Police report #PR-2024-8834 was filed. "
                "The insured sustained minor whiplash injuries and was treated at City "
                "General Hospital ER. Vehicle damage includes rear bumper replacement, "
                "trunk lid repair, and rear light assembly. Three repair estimates obtained "
                "ranging from $11,200 to $13,800.\n\n"
                "SUBMITTED DOCUMENTS:\n"
                "- Claim Form\n"
                "- Police Report\n"
                "- Medical Records\n"
                "- Repair Estimates\n"
                "- Photos of Damage\n\n"
                "REQUIRED DOCUMENTS:\n"
                "- Claim Form\n"
                "- Police Report\n"
                "- Medical Records\n"
                "- Repair Estimates\n"
                "- Photos of Damage\n"
                "- Witness Statements\n\n"
                "SLA: 48 hours | Hours Remaining: 36\n"
                "Previous Claims on Policy: 1\n"
            ),
        },
        {
            "filename": "health_surgery_claim.pdf",
            "text": (
                "INSURANCE CLAIM FORM\n\n"
                "Claim ID: CLM-2024-002\n"
                "Policy Number: POL-HEALTH-78234\n"
                "Claim Type: Health - Surgical Procedure\n"
                "Date of Incident: 2024-12-01\n"
                "Claim Amount: $45,000.00\n"
                "Policy Limit: $50,000.00\n\n"
                "NARRATIVE:\n"
                "The policyholder underwent an emergency appendectomy on December 1, 2024, "
                "at Metro Regional Medical Center. The patient presented to the ER with "
                "acute abdominal pain at 2:15 AM and was diagnosed with acute appendicitis "
                "with risk of perforation. Emergency laparoscopic surgery was performed by "
                "Dr. Sarah Chen at 4:30 AM. The patient was hospitalized for 3 days post-op "
                "with IV antibiotics. Total itemized billing includes: ER visit $3,200, "
                "surgical fee $18,500, anesthesia $4,200, hospital stay $15,600, pathology "
                "$1,500, medications $2,000. Pre-authorization was NOT obtained due to "
                "emergency nature of the procedure.\n\n"
                "SUBMITTED DOCUMENTS:\n"
                "- Claim Form\n"
                "- Hospital Invoice\n"
                "- Surgical Report\n\n"
                "REQUIRED DOCUMENTS:\n"
                "- Claim Form\n"
                "- Hospital Invoice\n"
                "- Surgical Report\n"
                "- Pre-Authorization (waived - emergency)\n"
                "- Pathology Report\n"
                "- Discharge Summary\n\n"
                "SLA: 72 hours | Hours Remaining: 4\n"
                "Previous Claims on Policy: 0\n"
            ),
        },
        {
            "filename": "property_fire_claim.pdf",
            "text": (
                "INSURANCE CLAIM FORM\n\n"
                "Claim ID: CLM-2024-003\n"
                "Policy Number: POL-PROP-33102\n"
                "Claim Type: Property - Fire Damage\n"
                "Date of Incident: 2024-10-28\n"
                "Claim Amount: $185,000.00\n"
                "Policy Limit: $200,000.00\n\n"
                "NARRATIVE:\n"
                "A fire broke out in the insured residential property at 742 Evergreen "
                "Terrace on October 28, 2024, at approximately 11:30 PM. The fire originated "
                "in the kitchen due to an unattended stove and spread to the living room and "
                "second-floor bedrooms before the fire department arrived. The fire department "
                "response time was 12 minutes. Approximately 60% of the structure sustained "
                "significant damage. The property was deemed uninhabitable. The insured and "
                "family of four have been displaced and are currently staying in temporary "
                "housing. Contents loss is estimated at $45,000 in addition to structural "
                "damage. Fire marshal investigation report confirms accidental origin. "
                "Two independent contractor estimates for restoration range from $170,000 "
                "to $195,000. The claim amount of $185,000 represents 92.5% of the policy "
                "limit. NOTE: The insured has filed 3 previous property claims in the last "
                "2 years.\n\n"
                "SUBMITTED DOCUMENTS:\n"
                "- Claim Form\n"
                "- Fire Department Report\n\n"
                "REQUIRED DOCUMENTS:\n"
                "- Claim Form\n"
                "- Fire Department Report\n"
                "- Fire Marshal Investigation Report\n"
                "- Contractor Estimates\n"
                "- Contents Inventory\n"
                "- Photos of Damage\n"
                "- Proof of Temporary Housing\n\n"
                "SLA: 96 hours | Hours Remaining: 5\n"
                "Previous Claims on Policy: 3\n"
            ),
        },
    ]

    paths = []
    for sample in samples:
        path = os.path.join(output_dir, sample["filename"])
        doc = pymupdf.open()
        # Split text into chunks that fit on a page
        lines = sample["text"].split("\n")
        chunk_size = 40
        for i in range(0, len(lines), chunk_size):
            page = doc.new_page()
            chunk = "\n".join(lines[i : i + chunk_size])
            page.insert_text((72, 72), chunk, fontsize=11)
        doc.save(path)
        doc.close()
        paths.append(path)

    return paths


if __name__ == "__main__":
    # Standalone test
    print("Generating sample PDFs...")
    paths = generate_sample_pdfs()
    for p in paths:
        print(f"\n--- {p} ---")
        text = extract_text(p)
        print(text[:300] + "..." if len(text) > 300 else text)
    print("\n[OK] pdf_extract.py works")
