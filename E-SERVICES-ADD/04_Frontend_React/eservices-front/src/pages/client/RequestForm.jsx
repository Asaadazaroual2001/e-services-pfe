import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServiceDetails, submitRequest } from '../../api/clientRequests';
import './RequestForm.css';

const RequestForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchServiceDetails();
    }
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const response = await getServiceDetails(id);
      setService(response.data);
      
      // Initialize form values
      const initialValues = {};
      if (response.data.fields) {
        response.data.fields.forEach(field => {
          initialValues[field.id] = '';
        });
      }
      setFormValues(initialValues);
    } catch (err) {
      setError('Service non trouvé');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    if (error) setError('');
  };

  const handleFileChange = (fieldId, file) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: file
    }));
  };

  const validateForm = () => {
    if (!service?.fields) return false;
    
    for (const field of service.fields) {
      if (field.required && !formValues[field.id]) {
        setError(`Le champ "${field.label}" est obligatoire`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError('');
      
      // Transform form values to API format
      const values = Object.entries(formValues)
        .filter(([_, value]) => value !== '')
        .map(([fieldId, value]) => ({
          field_id: parseInt(fieldId),
          value: typeof value === 'object' ? value.name : value
        }));

      const response = await submitRequest({
        service_id: parseInt(id),
        values
      });

      setSuccess(`Demande soumise! Référence: ${response.data.reference}`);
      setTimeout(() => navigate('/client/requests'), 3000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Chargement du formulaire...</div>;
  }

  if (!service) {
    return <div className="error">Service non trouvé</div>;
  }

  return (
    <div className="request-form">
      <div className="header">
        <h1>{service.name}</h1>
        {service.description && <p>{service.description}</p>}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="fields-grid">
          {service.fields?.map((field) => (
            <div key={field.id} className={`field field-${field.type}`}>
              <label>
                {field.label} {field.required && <span className="required">*</span>}
                {field.description && <span className="field-help">{field.description}</span>}
              </label>
              
              {field.type === 'textarea' && (
                <textarea
                  placeholder={field.placeholder}
                  value={formValues[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  rows={4}
                />
              )}
              
              {field.type === 'select' && field.options_json && (
                <select
                  value={formValues[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                >
                  <option value="">Choisir...</option>
                  {field.options_json.map((option, idx) => (
                    <option key={idx} value={option.value || option}>
                      {option.label || option}
                    </option>
                  ))}
                </select>
              )}
              
              {['text', 'email', 'number', 'date'].includes(field.type) && (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formValues[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === 'file' && (
                <input
                  type="file"
                  onChange={(e) => handleFileChange(field.id, e.target.files[0])}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => navigate('/client/services')}
          >
            ← Retour
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Soumission...' : 'Soumettre la demande'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestForm;
