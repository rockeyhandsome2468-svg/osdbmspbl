import os
import re

directory = "frontend/src"

replacements = {
    # Backgrounds
    r"bg-\[\#111c2a\]": "bg-white",
    r"bg-\[\#1a293b\]": "bg-slate-50",
    r"bg-\[\#0b121a\]": "bg-slate-50",
    r"bg-\[\#22354a\]": "bg-slate-100",
    r"bg-\[\#2d425b\]": "bg-slate-100",
    r"bg-\[\#23354a\]": "bg-slate-100",
    
    # Text
    r"text-slate-200": "text-slate-800",
    r"text-slate-300": "text-slate-600",
    r"text-slate-400": "text-slate-500",
    r"text-\[\#030b14\]": "text-white",
    
    # Borders
    r"border-\[\#2d425b\]": "border-slate-100",
    r"border-\[\#38516f\]": "border-slate-200",
    r"border-\[\#1e2f42\]": "border-slate-200",
}

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".jsx"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for dark, light in replacements.items():
                new_content = re.sub(dark, light, new_content)
                
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

