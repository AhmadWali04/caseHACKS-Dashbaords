import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function Application() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/application-questions`);
        const data = await response.json();
        setQuestions(data.questions || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setFetchingQuestions(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    const currentAnswers = answers[questionId] ? answers[questionId].split(',') : [];
    let newAnswers;
    
    if (checked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter(a => a !== option);
    }
    
    setAnswers({
      ...answers,
      [questionId]: newAnswers.join(','),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/application/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: user.email,
          name: user.user_metadata?.name || user.email,
          answers: answers,
        }),
      });

      if (response.ok) {
        alert('Application submitted successfully!');
        navigate('/');
      } else {
        const error = await response.json();
        alert(`Failed to submit application: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question) => {
    const { id, question_text, question_type, options, is_required } = question;

    switch (question_type) {
      case 'text':
        return (
          <input
            type="text"
            value={answers[id] || ''}
            onChange={(e) => handleChange(id, e.target.value)}
            required={is_required}
            className="w-full p-3 rounded-md"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        );

      case 'long_text':
        return (
          <textarea
            value={answers[id] || ''}
            onChange={(e) => handleChange(id, e.target.value)}
            required={is_required}
            rows={4}
            className="w-full p-3 rounded-md"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={answers[id] || ''}
            onChange={(e) => handleChange(id, e.target.value)}
            required={is_required}
            className="w-full p-3 rounded-md"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={answers[id] || ''}
            onChange={(e) => handleChange(id, e.target.value)}
            required={is_required}
            className="w-full p-3 rounded-md"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            placeholder="https://example.com"
          />
        );

      case 'multiple_choice':
        return (
          <select
            value={answers[id] || ''}
            onChange={(e) => handleChange(id, e.target.value)}
            required={is_required}
            className="w-full p-3 rounded-md"
            style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">Select an option</option>
            {options && options.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'checkbox':
        const selectedOptions = answers[id] ? answers[id].split(',') : [];
        return (
          <div className="space-y-2">
            {options && options.map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => handleCheckboxChange(id, option, e.target.checked)}
                  className="rounded"
                />
                <span style={{ color: 'var(--foreground)' }}>{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (fetchingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--foreground)', opacity: 0.6 }}>Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="p-8 rounded-2xl shadow-sm max-w-2xl w-full" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Complete Your Application</h1>
        <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Fill out the form below to apply for CaseHacks
        </p>

        {questions.length === 0 ? (
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            No application questions available at this time.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {questions.map((question) => (
              <div key={question.id}>
                <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {question.question_text}
                  {question.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderQuestion(question)}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 rounded-md text-white font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
