import './practiceCard.css'
import { Link } from 'react-router-dom'
import {
  ClockCircleOutlined,
  AppstoreOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  LineChartOutlined,
  CrownFilled,
} from '@ant-design/icons'

const PracticeCard = ({ item }) => {
  const minutes = Math.round((item?.durationSec ?? 0) / 60)
  const isPremium = !item?.isFree

  return (
    <div className={`practice-card ${isPremium ? 'premium' : 'free'}`}>
      {isPremium && (
        <div className='sticker'>
          <CrownFilled className='sticker-icon' />
          <span>Premium</span>
        </div>
      )}

      <div className='title'>{item?.title ?? 'Untitled Set'}</div>

      <div className='meta'>
        <span className='meta-chip'>
          <ClockCircleOutlined /> {minutes} phút
        </span>
        <span className='dot'>•</span>
        <span className='meta-chip'>
          <AppstoreOutlined /> {item?.partsCount ?? 0} phần
        </span>
        <span className='dot'>•</span>
        <span className='meta-chip'>
          <QuestionCircleOutlined /> {item?.totalQuestions ?? 0} câu
        </span>
      </div>

      <div className='tags'>
        {item?.tags?.map((t) => (
          <span key={t} className='tag'>#{t}</span>
        ))}
      </div>

      <div className='footer'>
        <div className='stats'>
          <span className='meta-chip'>
            <TeamOutlined /> {item?.stats?.users ?? 0}
          </span>
          <span className='dot'>•</span>
          <span className='meta-chip'>
            <LineChartOutlined /> {item?.stats?.attempts ?? 0}
          </span>
        </div>

        <Link to={`/practice/${item?.id}`} className='btn-detail'>
          Chi tiết
        </Link>
      </div>
    </div>
  )
}

export default PracticeCard
