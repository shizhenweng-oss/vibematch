import sys

def patch():
    with open('src/App.jsx', 'r') as f:
        lines = f.readlines()

    with open('new_layout.jsx', 'r') as f:
        new_layout = f.read()

    # Find start and end indices
    start_idx = -1
    end_idx = -1
    
    for i, line in enumerate(lines):
        if '<div className="min-h-screen mesh-bg flex flex-col overflow-hidden">' in line:
            start_idx = i
        if "{view === 'feed' && userProfile && (" in line:
            # The dashboard block ends just before this, at `      )}`
            # Let's search backwards from here
            for j in range(i-1, -1, -1):
                if lines[j].strip() == ')}':
                    # The end of the block is the line BEFORE this `)}`
                    # wait, `)}` is line 2669. `new_layout.jsx` contains its own `)}` or does it?
                    # new_layout.jsx ends with `        </div>`
                    # So we should replace from start_idx up to but NOT including `      )}`
                    end_idx = j
                    break
            break

    if start_idx == -1 or end_idx == -1:
        print("Could not find start or end indices.")
        sys.exit(1)
        
    patched_lines = lines[:start_idx] + [new_layout + '\n'] + lines[end_idx:]
    patched_content = "".join(patched_lines)
    
    # Also add isCreatorPanelOpen state
    state_str = "const [sidebarOpen, setSidebarOpen] = useState(true)"
    if state_str in patched_content:
        patched_content = patched_content.replace(
            state_str,
            state_str + "\n  const [isCreatorPanelOpen, setIsCreatorPanelOpen] = useState(false)"
        )
        
    # Also add lucide icons
    import_str = "from 'lucide-react'"
    if import_str in patched_content:
        patched_content = patched_content.replace(
            "} from 'lucide-react'",
            ", LayoutDashboard, Camera, Settings } from 'lucide-react'"
        )

    with open('src/App.jsx', 'w') as f:
        f.write(patched_content)

    print(f"Patch successful! Replaced lines {start_idx} to {end_idx}")

if __name__ == '__main__':
    patch()
