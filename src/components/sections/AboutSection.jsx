import { about } from '../../data/about.js'
import Lanyard from '../Lanyard.jsx'

export default function AboutSection() {
  return (
    <section aria-label="关于">
      <div className="about-layout">
        <div className="about-main">
          <header className="section-head">
            <h2 className="section-title mono">~/about</h2>
            <p className="section-desc">关于我，以及这个博客为什么存在。</p>
          </header>

          <div className="about-header">
            <h3 className="about-name">{about.name}</h3>
            <p className="about-meta">
              {about.school} · {about.grade} · 出生于
              <span className="mono"> {about.birthYear} </span>
              年
            </p>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">个人介绍</h4>
            {about.intro.map((para, i) => (
              <p key={i} className="about-paragraph">{para}</p>
            ))}
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">学习方向</h4>
            <div className="direction-chips">
              {about.directions.map((dir) => (
                <span key={dir} className="chip">{dir}</span>
              ))}
            </div>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">兴趣爱好</h4>
            <ul className="interest-list">
              {about.interests.map((item) => (
                <li key={item} className="chip">{item}</li>
              ))}
            </ul>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">一些数据</h4>
            <p className="about-stats-line">
              {about.stats.map((stat, i) => (
                <span key={stat.label}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <span className="stat mono">{stat.value}</span> {stat.label}
                </span>
              ))}
            </p>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">联系方式</h4>
            <div className="contact-list">
              <div className="contact-item mono">
                <span className="contact-label">email</span> · {about.contact.email}
              </div>
              <div className="contact-item mono">
                <span className="contact-label">github</span> · {about.contact.github}
              </div>
              <div className="contact-item mono">
                <span className="contact-label">location</span> · {about.contact.location}
              </div>
            </div>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">博客初衷</h4>
            {about.blogPurpose.map((para, i) => (
              <p key={i} className="about-paragraph">{para}</p>
            ))}
          </div>
        </div>

        <aside className="about-side" aria-label="3D 挂绳吊牌">
          <Lanyard position={[0, 0, 20]} gravity={[0, -40, 0]} />
        </aside>
      </div>
    </section>
  )
}
