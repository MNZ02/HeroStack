import Cursor from './components/Cursor'
import FrameStage from './components/FrameStage'
import HeroChrome from './components/HeroChrome'
import { useViewport } from './lib/viewport'

export default function App() {
  const viewport = useViewport()
  const pointer = viewport.isDesktop && !viewport.isTouch

  return (
    <main
      style={{
        position: 'relative',
        height: '100dvh',
        overflow: 'hidden',
        background: '#fff',
        userSelect: 'none',
        // The stage fills the viewport, so the real cursor is replaced by the
        // drawn mark — but only where there is a hover-capable pointer to
        // replace.
        cursor: pointer ? 'none' : 'auto',
      }}
    >
      <FrameStage viewport={viewport} />
      <HeroChrome viewport={viewport} />
      {pointer && <Cursor />}
    </main>
  )
}
