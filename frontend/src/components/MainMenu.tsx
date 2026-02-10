import React from 'react';
import './MainMenu.css';

export type MenuItem = {
  id: string;
  label: string;
  icon?: string;
};

interface MainMenuProps {
  items: MenuItem[];
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ items, activeItem, onItemClick }) => {
  return (
    <nav className="main-menu">
      {items.map((item) => (
        <button
          key={item.id}
          className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
          onClick={() => onItemClick(item.id)}
        >
          {item.icon && <span className="menu-item-icon">{item.icon}</span>}
          <span className="menu-item-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MainMenu;
