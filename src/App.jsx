import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import TeamSection from './components/TeamSection'
import CTASection from './components/CTASection'
import Footer from './components/Footer'
import SearchPage from './pages/SearchPage'

function LandingPage() {
  return (
    <main className="pt-16 md:pt-24 overflow-x-hidden">
      <HeroSection />
      <FeaturesSection />
      <TeamSection />
      <CTASection />
    </main>
  )
}

function App() {
  return (
    <div className="bg-surface text-on-surface font-body">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
