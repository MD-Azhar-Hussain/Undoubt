import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import socket from '../utils/socket';
import QRCode from 'react-qr-code';
import { FaCopy, FaEye, FaEyeSlash } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RoomPage = ({ role }) => {
  const { roomId } = useParams();
  const { user } = useUser();
  const [doubts, setDoubts] = useState([]);
  const [newDoubt, setNewDoubt] = useState('');
  const [upvotedDoubts, setUpvotedDoubts] = useState(new Set(JSON.parse(localStorage.getItem('upvotedDoubts') || '[]')));
  const [visibleEmails, setVisibleEmails] = useState(new Set());

  useEffect(() => {
    socket.emit('joinRoom', roomId, role);

    socket.on('existingDoubts', (existingDoubts) => {
      setDoubts(existingDoubts);
      const upvoted = new Set(existingDoubts.filter(d => d.upvotedBy.includes(user.id)).map(d => d.id));
      setUpvotedDoubts(upvoted);
    });

    socket.on('newDoubt', (doubt) => {
      setDoubts((prevDoubts) => [...prevDoubts, doubt]);
    });

    socket.on('upvoteDoubt', (doubtId) => {
      setDoubts((prevDoubts) =>
        prevDoubts.map((doubt) =>
          doubt.id === doubtId ? { ...doubt, upvotes: doubt.upvotes + 1 } : doubt
        )
      );
    });

    socket.on('downvoteDoubt', (doubtId) => {
      setDoubts((prevDoubts) =>
        prevDoubts.map((doubt) =>
          doubt.id === doubtId ? { ...doubt, upvotes: doubt.upvotes - 1 } : doubt
        )
      );
    });

    return () => {
      socket.off('existingDoubts');
      socket.off('newDoubt');
      socket.off('upvoteDoubt');
      socket.off('downvoteDoubt');
    };
  }, [roomId, role, user.id]);

  const handleAddDoubt = () => {
    const doubt = {
      id: Math.random().toString(36).substring(2, 15),
      text: newDoubt,
      user: user.primaryEmailAddress.emailAddress, // Ensure the email is retrieved from Clerk
      upvotes: 0,
    };
    socket.emit('newDoubt', roomId, doubt);
    setNewDoubt('');
  };

  const handleToggleUpvote = (id) => {
    if (upvotedDoubts.has(id)) {
      socket.emit('downvoteDoubt', roomId, id, user.id);
      setUpvotedDoubts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        localStorage.setItem('upvotedDoubts', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    } else {
      socket.emit('upvoteDoubt', roomId, id, user.id);
      setUpvotedDoubts((prev) => {
        const newSet = new Set(prev).add(id);
        localStorage.setItem('upvotedDoubts', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    }
  };

  const handleToggleEmailVisibility = (id) => {
    setVisibleEmails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied to clipboard!');
  };

  const topDoubts = doubts.sort((a, b) => b.upvotes - a.upvotes).slice(0, 3);

  return (
    <div className='flex flex-col items-center mt-40'>
      <h1 className='text-5xl'>Room ID: {roomId}<FaCopy onClick={handleCopyRoomId} className='cursor-pointer inline-block ml-2 text-3xl' /></h1>
      {role !== 'participant' && (
        <div className='flex flex-col items-center justify-center mt-10'>
          <QRCode className='mb-5' value={`http://localhost:5173/join-room/${roomId}`} />
          <p className='text-2xl text-center'>Share this QR code with users to join the room.</p>
        </div>
      )}
      {role === 'participant' && (
        <div className='mt-10'>
          <input
            type='text'
            value={newDoubt}
            onChange={(e) => setNewDoubt(e.target.value)}
            placeholder='Enter your doubt'
            className='p-2 border-2 border-black rounded-lg'
          />
          <button onClick={handleAddDoubt} className='ml-2 text-2xl bg-blue-600 hover:bg-blue-700 cursor-pointer p-2 rounded-lg text-white border-2 border-black'>Add Doubt</button>
        </div>
      )}
      <div className='mt-10'>
        <h2 className='text-3xl'>Doubts</h2>
        {doubts.map(doubt => (
          <div key={doubt.id} className='mt-5 p-2 border-2 border-black rounded-lg'>
            <p>{doubt.text}</p>
            {role === 'host' && (
              <div className='flex items-center'>
                <button
                  onClick={() => handleToggleEmailVisibility(doubt.id)}
                  className='text-xl bg-gray-600 hover:bg-gray-700 cursor-pointer p-1 rounded-lg text-white border-2 border-black ml-2'
                >
                  {visibleEmails.has(doubt.id) ? <FaEyeSlash /> : <FaEye />}
                </button>
                {visibleEmails.has(doubt.id) && <p className='text-lg'>{user.primaryEmailAddress.emailAddress}</p>}
              </div>
            )}
            <p>Upvotes: {doubt.upvotes}</p>
            <button
              onClick={() => handleToggleUpvote(doubt.id)}
              className={`text-xl ${upvotedDoubts.has(doubt.id) ? 'bg-red-600' : 'bg-blue-600'} hover:bg-blue-700 cursor-pointer p-1 rounded-lg text-white border-2 border-black`}
            >
              {upvotedDoubts.has(doubt.id) ? 'Undo Upvote' : 'Upvote'}
            </button>
          </div>
        ))}
      </div>
      <div className='mt-10'>
        <h2 className='text-3xl'>Top Doubts</h2>
        {topDoubts.map(doubt => (
          <div key={doubt.id} className='mt-5 p-2 border-2 border-black rounded-lg'>
            <p>{doubt.text}</p>
            {role === 'host' && (
              <div className='flex items-center'>
                <button
                  onClick={() => handleToggleEmailVisibility(doubt.id)}
                  className='text-xl bg-gray-600 hover:bg-gray-700 cursor-pointer p-1 rounded-lg text-white border-2 border-black ml-2'
                >
                  {visibleEmails.has(doubt.id) ? <FaEyeSlash /> : <FaEye />}
                </button>
                {visibleEmails.has(doubt.id) && <p className='text-xl'>{user.primaryEmailAddress.emailAddress}</p>}
              </div>
            )}
            <p>Upvotes: {doubt.upvotes}</p>
          </div>
        ))}
      </div>
      <ToastContainer />
    </div>
  );
};

export default RoomPage;
