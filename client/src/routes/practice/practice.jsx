import './practice.css'
import { useEffect, useState } from 'react'
import PracticeCard from '../../components/practiceCard/practiceCard'
import { createToeicAttempt, getToeicSets } from '../../utils/toeicApi.js'

const Practice = () => {
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    getToeicSets().then((list) => { if (alive) setItems(list || []) })
    return () => { alive = false }
  }, [])

  return (
    <div className='practice-page'>
      <h1 className='practice-heading'>Luyện đề TOEIC</h1>
      <div className='cards'>
        {items.map((it) => <PracticeCard key={it.id} item={it} />)}
      </div>
    </div>
  )
}

export default Practice
