import re

with open('src/views/PublicSheet.tsx', 'r') as f:
    content = f.read()

# Blood type
content = content.replace(
    "['Grupo sanguíneo', readValue(profile, ['bloodType', 'blood_type', 'sangre', 'grupo_sanguineo'])],",
    "['Grupo sanguíneo', readValue(profile, ['basic_blood_type', 'bloodType', 'blood_type', 'sangre', 'grupo_sanguineo'])],"
)

# Age
content = content.replace(
    "['Edad', readValue(profile, ['age', 'edad'])],",
    "['Edad', readValue(profile, ['basic_age', 'age', 'edad'])],"
)

# Alignment
content = content.replace(
    "['Alineación', readValue(profile, ['alignment', 'alineacion', 'alineación'])],",
    "['Alineación', readValue(profile, ['basic_alignment', 'alignment', 'alineacion', 'alineación'])],"
)

with open('src/views/PublicSheet.tsx', 'w') as f:
    f.write(content)

