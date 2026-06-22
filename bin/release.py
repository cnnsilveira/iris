#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
import zipfile

def run_command(cmd):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(result.returncode)
    return result.stdout

def main():
    plugin_slug = "iris"
    dist_dir = "dist"
    zip_filename = f"{plugin_slug}.zip"

    # Ensure we are in the script's parent plugin directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_root)

    # 1. Clean previous build files
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    if os.path.exists(zip_filename):
        os.remove(zip_filename)

    # 2. Compile frontend assets
    print("🎨 Compiling frontend assets...")
    run_command(["npm", "run", "build"])

    # 3. Optimize PHP dependencies without dev tools
    print("🐘 Optimizing PHP autoloader...")
    run_command(["composer", "install", "--no-dev", "--optimize-autoloader"])

    try:
        # 4. Create temp dist folder
        temp_plugin_dir = os.path.join(dist_dir, plugin_slug)
        os.makedirs(temp_plugin_dir)

        # 5. Copy files
        print("📂 Copying production files...")
        files_to_copy = ["iris.php", "uninstall.php", "README.md", "CHANGELOG.md"]
        dirs_to_copy = ["app", "assets", "vendor"]

        for f in files_to_copy:
            if os.path.exists(f):
                shutil.copy(f, os.path.join(temp_plugin_dir, f))

        for d in dirs_to_copy:
            if os.path.exists(d):
                shutil.copytree(d, os.path.join(temp_plugin_dir, d), dirs_exist_ok=True)

        # Remove source maps from the distribution build
        for root, _, files in os.walk(temp_plugin_dir):
            for file in files:
                if file.endswith(".map"):
                    os.remove(os.path.join(root, file))

        # 6. Create ZIP archive
        print("🤐 Creating ZIP archive...")
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(temp_plugin_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, dist_dir)
                    zipf.write(file_path, arcname)

        print(f"✅ Success! Stable package generated: {zip_filename}")

    finally:
        # 7. Clean up dist dir
        if os.path.exists(dist_dir):
            shutil.rmtree(dist_dir)

        # 8. Restore development PHP dependencies
        print("🔄 Restoring development dependencies...")
        run_command(["composer", "install"])

if __name__ == "__main__":
    main()
