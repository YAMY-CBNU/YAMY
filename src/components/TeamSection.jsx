const members = [
  {
    name: 'HyunJoon Choi',
    role: 'Team Leader',
    sub: 'Full-Stack',
    bgClass: 'bg-primary-container',
    rotate: 'rotate-6',
    img: '/images/HJchoi.png',
  },
  {
    name: 'JeongWoo Han',
    role: 'Backend',
    sub: 'Database',
    bgClass: 'bg-secondary-container',
    rotate: '-rotate-6',
    img: '/images/JWhan.png',
  },
  {
    name: 'NaHyun Choi',
    role: 'Frontend',
    sub: 'UI/UX Design',
    bgClass: 'bg-outline-variant',
    rotate: 'rotate-3',
    img: '/images/NHchoi.png',
  },
  {
    name: 'Nandin-Erdene',
    role: 'Frontend',
    sub: 'UI/UX Design',
    bgClass: 'bg-tertiary-container',
    rotate: '-rotate-3',
    img: '/images/Nandin.png',
  },
]

function TeamSection() {
  return (
    <section className="fluid-section fluid-px max-w-7xl mx-auto">
      <div className="text-center fluid-mb">
        <h2 className="fluid-h2 font-bold text-on-surface fluid-mb-sm">
          YAMY를 만드는 사람들
        </h2>
        <p className="fluid-body text-secondary">
          &quot;요리를 잘 몰라도 요리가 즐거워지는 마법, 기술로 그 답을 찾는 팀 YAMY입니다.&quot;
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 fluid-gap">
        {members.map((member) => (
          <div key={member.name} className="text-center group">
            <div className="fluid-photo relative fluid-mb-sm mx-auto">
              <div
                className={`absolute inset-0 ${member.bgClass} rounded-full ${member.rotate} group-hover:rotate-0 transition-transform duration-500`}
              />
              <img
                alt={`${member.name} profile`}
                className="absolute inset-0 w-full h-full object-cover rounded-full border-4 border-primary shadow-lg"
                src={member.img}
              />
            </div>
            <h4 className="fluid-h4 font-bold text-on-surface">{member.name}</h4>
            <p className="fluid-sm text-primary font-medium">{member.role}</p>
            <p className="fluid-sm text-secondary font-medium mt-1">{member.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TeamSection
