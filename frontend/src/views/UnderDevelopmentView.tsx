import React from 'react';
import { WrenchIcon } from '../components/icons';
import './UnderDevelopmentView.css';

const UnderDevelopmentView: React.FC = () => {
  return (
    <div className="under-development-view">
      <div className="under-development-content">
        <WrenchIcon size={72} strokeWidth={1} className="under-development-icon" />
        <h2 className="under-development-title">该功能正在开发中......</h2>
        <p className="under-development-description">
          我们正在努力开发这个功能，敬请期待！
        </p>
      </div>
    </div>
  );
};

export default UnderDevelopmentView;
