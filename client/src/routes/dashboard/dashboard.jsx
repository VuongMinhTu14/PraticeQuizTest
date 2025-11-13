import { Carousel } from "antd";
import useAuthStore from "../../utils/authStore";
import "./dashboard.css";
import { SmileTwoTone } from "@ant-design/icons";
const Dashboard = () => {
  const { currentUser } = useAuthStore();
  const username = currentUser?.username || currentUser?.displayName || "User";

  const images = [
    "/images/1.png", 
    "/images/2.png",
    "/images/3.png",
  ];

  return (
    <div className="dashboard-page">
      <h2>Xin chào, <strong>{username}</strong> <SmileTwoTone /></h2>

      <div className="slide-container">
        <Carousel autoplay dots={{ className: "custom-dots" }}>
          {images.map((src, i) => (
            <div key={i} className="slide-frame">
              <div className="slide-media">
                <img src={src} alt={`slide-${i}`} loading="lazy" />
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  );
};

export default Dashboard;
