const members = [
  {
    name: '최현준',
    role: 'Team Leader',
    sub: 'Frontend · AI',
    bgClass: 'bg-primary-container',
    rotate: 'rotate-6',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi3K4iKDKEq6Ng6eJM45kadfLjU3GlI1KY8BZqLaPGUNA_MulN3M6Jo31tYheMuCe390YTuTxt82cRySDTcuEf0iwRMJo4BPvFk2VZxpvgBzkDU8MwpeRvFBtZgAiFA7ftObmvtrFQYuaWfDsZtPlP2zr4s09kjmXqrIUByZQPKoYQOWK5UppvjpryesSrRjckYtSdOcKVQ-ClvwMe07zO2HbJ6orA8JrkQAM38kyr34wbuHDjbN_Wmvdg5-XyHwNg8KipR5kSM1I',
  },
  {
    name: '한정우',
    role: 'Backend',
    sub: 'Database',
    bgClass: 'bg-secondary-container',
    rotate: '-rotate-6',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXxM7oDJ_jbplF_qb5S-O-YDEoQpQBPjX3V0T_tjBPvltMzQjKCYlJmbuU3_uqDZApohl8wF-uM_uBugKmauek4s9A61vAgIuIFaG2dTbeUG29me7GC7zw0M79EAHlRJXqASDW5hJ-BPgxTscnYq0A_856omiTc6Z1eks2ScNakUjZX16EvcYYYnevtrPu4q5UdHoeSLB1bmQ9owDqV6xXqZimx84oBq0BuwkvNhr8pL1Bx3PPw1k7NLDttPj3-QQ2yc5OCNJNxiY',
  },
  {
    name: '최나현',
    role: 'Frontend',
    sub: 'UI/UX Design',
    bgClass: 'bg-outline-variant',
    rotate: 'rotate-3',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATNYYPzEPY6o2zXOldJk55zhwtL_aBuiOa59bPYtc-3QFdoMVRH5XBhwAW82e6LFPwIKHrBm3p8hQJe2xhcBCZ35EJd2cZaQBNlj6Rw_Ak-CgBDMDsIZdHIiYi48cAlX_629f1tPv1e2Xp-MXrUliiG-kq876kCmIwg31N9LoGyvY0_AAssA6TNetO6we80mXWgQTcoeQnhMA9QSvnSR6WIGzI9XEvVKwlyj9nlNN2wYeboLIPXeffQaEt8HEM-j2D4--UNAL1bXo',
  },
  {
    name: '최현우',
    role: 'Experience Designer',
    sub: null,
    bgClass: 'bg-tertiary-container',
    rotate: '-rotate-3',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJyYO6Jx8NDlTFLJy1NlpgUEyZhRrMY-wuo3y96FAkzTi1nBwjZKj4_WqOqzdk-fSNXiXOPRil9guXkS0omCbWik33QeD09QPN7eTnldG-Oh2CalkDX2caXWYzcZzoLOGtr1KHw2wdp4ka3OwKFO146VvQGS7n_6QZJ0XielDiLivz5W0ZUUkGp5pbDK8UwkftdQJew8Z4HjlZXbSmmN7BiUpUx1N8vO1WIvBV8QgpcMik3as2WDduwVH0yAz1MAoDw2p7OtXG86c',
  },
]

function TeamSection() {
  return (
    <section className="fluid-section fluid-px max-w-7xl mx-auto">
      <div className="text-center fluid-mb">
        <h2 className="fluid-h2 font-bold text-on-surface fluid-mb-sm">YAMY를 만드는 사람들</h2>
        <p className="fluid-body text-secondary">
          "요리를 잘 몰라도 요리가 즐거워지는 마법, 기술로 그 답을 찾는 팀 YAMY입니다."
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 fluid-gap">
        {members.map((m) => (
          <div key={m.name} className="text-center group">
            <div className="fluid-photo relative fluid-mb-sm mx-auto">
              <div className={`absolute inset-0 ${m.bgClass} rounded-full ${m.rotate} group-hover:rotate-0 transition-transform duration-500`} />
              <img
                alt="Team member"
                className="absolute inset-0 w-full h-full object-cover rounded-full border-4 border-surface shadow-lg"
                src={m.img}
              />
            </div>
            <h4 className="fluid-h4 font-bold text-on-surface">{m.name}</h4>
            <p className="fluid-sm text-primary font-medium">{m.role}</p>
            {m.sub && <p className="fluid-sm text-secondary font-medium mt-1">{m.sub}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

export default TeamSection
