from pluto_client import Website


def build_react(project_path: str):
    # Compile react app
    pass


react_path = "path/to/your/react/app"
dist_path = build_react(react_path)
website = Website(dist_path, "website")
