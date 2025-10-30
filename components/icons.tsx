import React from 'react';

export const UploadIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

export const CloseIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ChevronLeftIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export const ChevronRightIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

export const TrashIcon: React.FC = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
      />
    </svg>
);

export const EditIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
    aria-hidden="true"
    >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" 
    />
  </svg>
);

export const SettingsIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path 
      fillRule="evenodd" 
      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0l-.1.41a1.5 1.5 0 01-2.1 1.45l-.41-.1c-1.56-.38-2.94.99-2.56 2.56l.1.41a1.5 1.5 0 01-1.45 2.1l-.41.1c-1.56.38-1.56 2.6 0 2.98l.41.1a1.5 1.5 0 011.45 2.1l-.1.41c-.38 1.56.99 2.94 2.56 2.56l.41-.1a1.5 1.5 0 012.1 1.45l.1.41c.38 1.56 2.6 1.56 2.98 0l.1-.41a1.5 1.5 0 012.1-1.45l.41.1c1.56.38 2.94-.99 2.56-2.56l-.1-.41a1.5 1.5 0 011.45-2.1l.41-.1c1.56-.38 1.56-2.6 0-2.98l-.41-.1a1.5 1.5 0 01-1.45-2.1l.1-.41c.38-1.56-.99-2.94-2.56-2.56l-.41.1a1.5 1.5 0 01-2.1-1.45l-.1-.41zM10 13a3 3 0 100-6 3 3 0 000 6z" 
      clipRule="evenodd" 
    />
  </svg>
);

export const GoogleIcon: React.FC = () => (
  <svg 
    className="h-5 w-5" 
    viewBox="0 0 48 48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path 
      d="M48 24C48 22.0427 47.836 20.126 47.5187 18.25H24.375V28.75H37.8115C37.2219 31.851 35.3359 34.4885 32.6187 36.2165V42.3489H40.4859C45.3125 37.8184 48 31.4281 48 24Z" 
      fill="#4285F4" 
    />
    <path 
      d="M24.375 48C30.6865 48 35.918 46.0125 39.0969 42.3489L32.6187 36.2165C30.5594 37.641 27.7021 38.5417 24.375 38.5417C18.1208 38.5417 12.8755 34.3469 11.025 28.5H3.00195V34.7832C6.18073 42.6391 14.5422 48 24.375 48Z" 
      fill="#34A853" 
    />
    <path 
      d="M11.025 28.5C10.5188 27.0344 10.25 25.475 10.25 23.875C10.25 22.275 10.5188 20.7156 11.025 19.25V12.9668H3.00195C1.125 16.5913 0 20.1 0 23.875C0 27.65 1.125 31.1587 3.00195 34.7832L11.025 28.5Z" 
      fill="#FBBC05" 
    />
    <path 
      d="M24.375 9.20833C27.9188 9.20833 30.9833 10.45 32.9625 12.2835L39.2635 6.22396C35.9031 3.12187 30.6865 0.75 24.375 0.75C14.5422 0.75 6.18073 6.11094 3.00195 12.9668L11.025 19.25C12.8755 13.4031 18.1208 9.20833 24.375 9.20833Z" 
      fill="#EA4335" 
    />
  </svg>
);

export const CopyIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
    />
  </svg>
);

export const CheckIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5 text-green-400" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M5 13l4 4L19 7" 
    />
  </svg>
);

export const EyeIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path 
      fillRule="evenodd" 
      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" 
      clipRule="evenodd" 
    />
  </svg>
);

export const DownloadIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path 
      fillRule="evenodd" 
      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" 
      clipRule="evenodd" 
    />
  </svg>
);
