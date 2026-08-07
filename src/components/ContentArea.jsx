import HomeSection from './sections/HomeSection.jsx'
import BlogSection from './sections/BlogSection.jsx'
import ProjectsSection from './sections/ProjectsSection.jsx'
import AboutSection from './sections/AboutSection.jsx'
import './ContentArea.css'

export default function ContentArea({ activeTab, onNavigate, focusId }) {
  return (
    <main className="content-area">
      <div className="content-shell" key={activeTab}>
        {activeTab === 'home' && <HomeSection onNavigate={onNavigate} />}
        {activeTab === 'blog' && <BlogSection focusId={focusId} />}
        {activeTab === 'projects' && <ProjectsSection focusId={focusId} />}
        {activeTab === 'about' && <AboutSection />}
      </div>
    </main>
  )
}
