        <div className="min-h-screen mesh-bg flex flex-col overflow-hidden">
          <UserHeader
            userProfile={userProfile}
            githubProfile={githubProfile}
            onSignOut={handleSignOut}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(v => !v)}
            onGoToFeed={() => setView('feed')}
          />

          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Column: Developer Roster */}
            {sidebarOpen && (
              <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-slate-800/60 bg-[#0b0f19]/50 backdrop-blur-xl h-full overflow-hidden">
                <div className="p-4 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary tracking-wide">Developer Roster</h2>
                      <p className="text-[10px] text-text-faint">Active platform members</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSimulateRegistration}
                    disabled={isSimulating}
                    className="w-full flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isSimulating ? 'Simulating...' : 'Simulate User'}
                  </button>
                  
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint" />
                    <input
                      type="text"
                      placeholder="Search dev stack, bio..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-[#161925] border border-slate-800/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-primary placeholder-text-faint focus:outline-none focus:border-teal-500/50 focus:bg-teal-500/5 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {filteredPeers.length > 0 ? (
                    filteredPeers.map((profile, i) => (
                      <div key={profile.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-800/60 bg-[#161925]/80 hover:border-indigo-500/30 transition-all group">
                        <div className="relative shrink-0">
                          <img
                            src={profile.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.github_url}`}
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-slate-800"
                            onError={(e) => { e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${profile.github_url}` }}
                          />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-teal-400 border-2 border-[#161925] rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-text-primary truncate group-hover:text-indigo-300 transition-colors">{extractGithubUsername(profile.github_url)}</h4>
                          <p className="text-[10px] text-teal-400 truncate mt-0.5">{profile.objective}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConnect(profile); }}
                          className="shrink-0 px-2 py-1 rounded border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-[9px] font-bold uppercase tracking-wider"
                        >
                          Connect
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-text-faint text-xs">No active peers found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Center Column: Project Showroom */}
            <div className="flex-1 min-w-0 overflow-auto scroll-smooth">
              <div className="max-w-[800px] mx-auto px-4 sm:px-6 pt-6 pb-24">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">
                      Project Showroom
                    </h1>
                    <p className="text-text-muted text-xs mt-1 tracking-wide">
                      {filteredProjectsShowroom.length} real-time ideas broadcasting
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                    Live Sync
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <AnimatePresence>
                    {filteredProjectsShowroom.map((project, i) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        index={i}
                        isVibed={vibedIdSet.has(project.id)}
                        onVibe={handleVibe}
                        onDelete={handleDeleteThought}
                        currentUsername={myUsername}
                        onOpenMessage={handleOpenMessage}
                        onOpenProjectChat={handleOpenProjectChat}
                        registeredUsers={registeredUsers}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right Column: Expandable Creator Control Panel / Side Sheet */}
            <motion.div
              layout
              initial={{ width: 64 }}
              animate={{ width: isCreatorPanelOpen ? 380 : 64 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="shrink-0 border-l border-slate-800/60 bg-[#161925]/95 backdrop-blur-2xl h-full flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {isCreatorPanelOpen ? (
                <div className="w-[380px] flex flex-col h-full opacity-0 animate-fade-in delay-100">
                  <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-[#0b0f19]/30">
                    <h2 className="text-sm font-black text-text-primary flex items-center gap-2 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Creator Panel
                    </h2>
                    <button onClick={() => setIsCreatorPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-text-faint hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                    <h3 className="text-xs font-bold text-text-muted mb-4 uppercase tracking-wider">New Project Thought</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1.5">Project Title</label>
                        <input
                          type="text"
                          value={showroomForm.title}
                          onChange={e => setShowroomForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full bg-[#0b0f19] border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1.5">Conceptual Insight</label>
                        <textarea
                          value={showroomForm.discussion}
                          onChange={e => setShowroomForm(f => ({ ...f, discussion: e.target.value }))}
                          rows={4}
                          className="w-full bg-[#0b0f19] border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-text-primary resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1.5">Tech Stack (Comma Sep)</label>
                        <input
                          type="text"
                          value={showroomForm.languagesInput}
                          onChange={e => {
                            const val = e.target.value
                            setShowroomForm(f => ({
                              ...f,
                              languagesInput: val,
                              languages: val.split(',').map(l => l.trim()).filter(Boolean)
                            }))
                          }}
                          className="w-full bg-[#0b0f19] border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1.5">GitHub URL</label>
                        <input
                          type="url"
                          value={showroomForm.github_url}
                          onChange={e => setShowroomForm(f => ({ ...f, github_url: e.target.value }))}
                          className="w-full bg-[#0b0f19] border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                        />
                      </div>

                      {/* Image upload gallery */}
                      <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800/60">
                        <p className="text-[10px] font-bold text-text-faint uppercase tracking-wider mb-3">Cover Assets</p>
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-700/50 rounded-xl cursor-pointer hover:border-indigo-500/50 bg-[#161925]/50 hover:bg-indigo-500/5 transition-all">
                          <Plus className="w-5 h-5 text-indigo-400 mb-1" />
                          <p className="text-[9px] text-text-muted font-bold tracking-wide">CLICK TO UPLOAD</p>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              const promises = files.map(file => {
                                return new Promise((resolve) => {
                                  const reader = new FileReader();
                                  reader.onload = (event) => resolve(event.target.result);
                                  reader.readAsDataURL(file);
                                });
                              });
                              Promise.all(promises).then(uploadedImages => {
                                setShowroomForm(f => {
                                  const newImages = [...(f.images || []), ...uploadedImages];
                                  const newCover = f.cover_image || newImages[0] || '';
                                  return { ...f, images: newImages, cover_image: newCover };
                                });
                              });
                            }}
                          />
                        </label>

                        {showroomForm.images && showroomForm.images.length > 0 && (
                          <div className="mt-3">
                            <div className="grid grid-cols-4 gap-2">
                              {showroomForm.images.map((img, idx) => {
                                const isCover = showroomForm.cover_image === img;
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setShowroomForm(f => ({ ...f, cover_image: img }))}
                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                      isCover ? 'border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] scale-105' : 'border-transparent hover:border-slate-600'
                                    }`}
                                  >
                                    <img src={img} className="w-full h-full object-cover" alt={`thumbnail-${idx}`} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 border-t border-slate-800/60 bg-[#0b0f19]/80">
                    <button
                      onClick={handleCreateFromShowroom}
                      disabled={isPublishingFromShowroom}
                      className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex justify-center items-center gap-2"
                    >
                      {isPublishingFromShowroom ? 'Publishing...' : 'Deploy Thought'}
                      {!isPublishingFromShowroom && <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-16 flex flex-col items-center py-6 h-full gap-8 bg-[#0b0f19]/30">
                  <button onClick={() => setIsCreatorPanelOpen(true)} className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all hover:scale-110 group relative">
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                  
                  <div className="flex flex-col gap-6 items-center flex-1">
                    <div className="p-2 rounded-xl text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div className="p-2 rounded-xl text-text-faint hover:text-teal-400 hover:bg-teal-500/10 cursor-pointer transition-colors relative">
                      <MessageSquare className="w-5 h-5" />
                      {messages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full"></span>}
                    </div>
                    <div className="p-2 rounded-xl text-text-faint hover:text-white cursor-pointer transition-colors">
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="p-2 rounded-xl text-text-faint hover:text-white cursor-pointer transition-colors mb-4">
                    <Settings className="w-5 h-5" />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
