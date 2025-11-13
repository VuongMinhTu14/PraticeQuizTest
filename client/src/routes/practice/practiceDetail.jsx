import './practiceDetail.css'
import { useParams, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons'

const PracticeDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // mock data: sau này thay bằng fetch(`/api/tests/${id}`)
  const test = useMemo(() => ({
    id,
    title: '2024 Practice Set TOEIC Test 7',
    durationSec: 120 * 60,
    parts: [
      { key: 'p1', name: 'Part 1', questions: 6,  tags: ['Tranh tả người','Tranh tả vật','Người & vật'] },
      { key: 'p2', name: 'Part 2', questions: 25, tags: ['WHAT','WHO','WHERE','WHEN','HOW','WHY','YES/NO','Lựa chọn'] },
      { key: 'p3', name: 'Part 3', questions: 39, tags: ['Mục đích','Địa điểm','Chi tiết cuộc hội thoại','Hành động tiếp theo'] },
      { key: 'p4', name: 'Part 4', questions: 30, tags: ['Announcement','Advertisement','News report','Excerpt meeting'] },
      { key: 'p5', name: 'Part 5', questions: 30, tags: ['Ngữ pháp','Từ vựng','Tân ngữ','Tính từ','Mạo từ'] },
      { key: 'p6', name: 'Part 6', questions: 16, tags: ['Email/Letter','Article/Review','Quảng cáo','Liên từ','Động từ nguyên mẫu'] },
      { key: 'p7', name: 'Part 7', questions: 54, tags: ['Một đoạn','Nhiều đoạn','Email/Letter','Article/Review','Thông báo'] },
    ],
    stats: { attempts: 626439, comments: 749, totalQuestions: 200, sections: 7 }
  }), [id])

  const [selected, setSelected] = useState([])
  const [limit, setLimit] = useState('') // phút; '' = không giới hạn

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const startPractice = () => {
    if (selected.length === 0) {
      alert('Chọn ít nhất 1 Part để luyện nhé!')
      return
    }
    // TODO: gọi POST /attempts để tạo attempt thật
    // Điều hướng tạm thời kèm query
    const q = new URLSearchParams({
      parts: selected.join(','),
      limit: limit || 'unlimited'
    }).toString()
    navigate(`/attempt/preview/${id}?${q}`)
  }

  const minutes = Math.round(test.durationSec / 60)

  return (
    <div className='detail-page'>
      <div className='detail-header'>
        <div className='chip'>#TOEIC</div>
        <h1 className='title'>{test.title}</h1>

        <div className='header-meta'>
          <span><ClockCircleOutlined /> Thời gian làm bài: {minutes} phút</span>
          <span>•</span>
          <span><FileTextOutlined /> {test.stats.sections} phần thi</span>
          <span>•</span>
          <span><CheckSquareOutlined /> {test.stats.totalQuestions} câu hỏi</span>
        </div>
        <div className='note'>
          Chế độ <b>Luyện tập</b> cho phép chọn part và giới hạn thời gian tuỳ ý.
          Để có điểm quy đổi theo thang TOEIC/IELTS, hãy làm chế độ <b>Full Test</b>.
        </div>
      </div>

      <div className='tabs'>
        <button className='tab active'>Luyện tập</button>
        <button className='tab' disabled>Full test (sắp có)</button>
        <button className='tab' disabled>Thảo luận</button>
      </div>

      <div className='panel'>
        <div className='panel-title'>Chọn phần thi bạn muốn làm</div>

        <div className='parts'>
          {test.parts.map((p) => (
            <label key={p.key} className={`part ${selected.includes(p.key) ? 'checked' : ''}`}>
              <input
                type='checkbox'
                checked={selected.includes(p.key)}
                onChange={() => toggle(p.key)}
              />
              <div className='part-main'>
                <div className='part-title'>
                  {p.name} <span className='count'>({p.questions} câu hỏi)</span>
                </div>
                <div className='tag-row'>
                  {p.tags.slice(0, 8).map(tag => (
                    <span key={tag} className='tag'>#{tag}</span>
                  ))}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className='time-block'>
          <div className='label'>Giới hạn thời gian <span className='hint'>(để trống = không giới hạn)</span></div>
          <select
            className='time-select'
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value=''>-- Chọn thời gian --</option>
            <option value='15'>15 phút</option>
            <option value='30'>30 phút</option>
            <option value='45'>45 phút</option>
            <option value='60'>60 phút</option>
            <option value='90'>90 phút</option>
            <option value='120'>120 phút</option>
          </select>
        </div>

        <button className='btn-start' onClick={startPractice}>
          Luyện tập
        </button>
      </div>
    </div>
  )
}

export default PracticeDetail
