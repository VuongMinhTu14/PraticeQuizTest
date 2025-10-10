import { Outlet } from 'react-router-dom'
import App from '../../App'
import './mainLayout.css'

const MainLayout = () => {
  return (
    <App>
      <div className='page-outlet'>
        <Outlet />
      </div>
    </App>
  )
}

export default MainLayout
