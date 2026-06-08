import sys

def patch():
    with open('src/App.jsx', 'r') as f:
        lines = f.readlines()

    start_idx = -1
    end_idx = -1
    
    for i, line in enumerate(lines):
        if "function ProjectCard({ project, isVibed = false" in line:
            start_idx = i
        if "function OnboardingWizard({ onComplete }) {" in line:
            # The end of ProjectCard is the line before this
            end_idx = i - 1
            break

    if start_idx == -1 or end_idx == -1:
        print("Could not find start or end indices for ProjectCard.")
        sys.exit(1)
        
    new_project_card = """
function ProjectCard({ project, isVibed = false, onVibe, onDelete, currentUsername, onOpenMessage, onOpenProjectChat, registeredUsers, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false)
  const primaryTech = project.languages?.[0] || 'Tech'
  const accent = getTagColor(primaryTech)
  const popularityScore = project.stars || 0
  const isHighlyPopular = popularityScore >= 5

  return (
    <motion.article
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative rounded-2xl border border-slate-800/60 overflow-hidden flex flex-col cursor-default shadow-card hover:shadow-card-hover bg-[#161925]"
    >
      {/* Tech color accent bar */}
      <div
        className="h-1 w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${accent.from}cc, ${accent.to}30, transparent)`,
        }}
      />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-black text-text-primary text-base leading-snug truncate flex-1 tracking-wide">
              {project.title || project.name}
            </h3>
            {/* Popularity Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 shadow-sm ${
              isHighlyPopular
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-[#0b0f19] border-slate-700/50 text-text-muted'
            }`}>
              {isHighlyPopular ? (
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              ) : (
                <TrendingUp className="w-3 h-3 text-text-muted" />
              )}
              <span className="tracking-widest uppercase">Vibes: {popularityScore}</span>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2.5 mb-4 select-none">
            <img
              src={project.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${project.author || 'dev'}`}
              alt={project.author || 'dev'}
              className="w-6 h-6 rounded-full border border-slate-700 shrink-0"
              onError={(e) => { e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${project.author || 'dev'}` }}
            />
            <span className="text-[11px] text-text-muted font-bold truncate tracking-wider">
              {project.handle || `@${project.author || 'builder'}`}
            </span>
          </div>

          {/* Compact horizontal grid of project thumbnails */}
          {project.images && project.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 mb-4 scrollbar-none select-none">
              {project.images.map((img, idx) => (
                <div
                  key={idx}
                  className={`w-16 h-12 rounded-lg overflow-hidden border shrink-0 bg-[#0b0f19] transition-all ${
                    project.cover_image === img ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800/60'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`thumbnail-${idx}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapsed skeleton vs Expanded view with Framer Motion layout transition */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              className="overflow-hidden mt-3 pt-4 border-t border-slate-800/60"
            >
              {/* Cover Image */}
              {project.cover_image && (
                <motion.div className="w-full h-48 overflow-hidden rounded-xl border border-slate-800/60 bg-[#0b0f19] mb-4 relative shadow-inner">
                  <img
                    src={project.cover_image}
                    alt={`${project.title || project.name} cover`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )}

              {/* Discussion Header */}
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Conceptual Insight</p>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                {project.discussion || project.description}
              </p>

              {/* Custom tag tokens */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#0b0f19] border border-slate-700 text-teal-400 shadow-sm"
                    >
                      <Tag className="w-2.5 h-2.5 text-teal-500" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Languages/Stack */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {(project.languages || []).map((lang) => {
                  const c = getTagColor(lang)
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: `${c.from}15`,
                        borderColor: `${c.from}40`,
                        color: c.text,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.from }} />
                      {lang}
                    </span>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-auto">
                <button
                  onClick={() => onVibe(project)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isVibed
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(79,70,229,0.15)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)]'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${isVibed ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {isVibed ? 'Vibed' : 'Vibe'}
                </button>

                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#0b0f19] border border-slate-700 text-text-primary hover:bg-[#1e293b] hover:border-slate-500 transition-all shadow-sm"
                  >
                    <Github className="w-3.5 h-3.5" />
                    Repo
                  </a>
                )}

                {currentUsername !== project.author && (
                  <button
                    onClick={() => {
                      const peerProfile = registeredUsers.find(u => u.github_url === project.github_url || u.id === project.author)
                      if (peerProfile) onOpenMessage(peerProfile)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#0b0f19] border border-slate-700 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/50 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Discuss
                  </button>
                )}

                {currentUsername === project.author && (
                  <button
                    onClick={() => onDelete(project.id)}
                    className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                    title="Delete Thought"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}
"""
    patched_lines = lines[:start_idx] + [new_project_card + '\n'] + lines[end_idx:]
    
    with open('src/App.jsx', 'w') as f:
        f.writelines(patched_lines)

    print(f"ProjectCard Patch successful! Replaced lines {start_idx} to {end_idx}")

if __name__ == '__main__':
    patch()
