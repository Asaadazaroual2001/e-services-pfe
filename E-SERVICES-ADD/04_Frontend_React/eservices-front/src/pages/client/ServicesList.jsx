import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getServices } from '../../api/clientRequests';
import './ServicesList.css';

const ServicesList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getServices({ 
        search, 
        per_page: 12, 
        page 
      });
      setServices(response.data || []);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des services');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchServices(1);
  };

  if (loading) {
    return (
      <div className="services-list">
        <div className="loading">Chargement des services...</div>
      </div>
    );
  }

  return (
    <div className="services-list">
      <div className="header">
        <h1>Nos Services</h1>
        <p>Choisissez un service pour faire votre demande</p>
        
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Rechercher un service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            Rechercher
          </button>
        </form>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="services-grid">
        {services.map((service) => (
          <div key={service.id} className="service-card">
            <div className="service-icon">📋</div>
            <h3>{service.name}</h3>
            {service.description && (
              <p className="description">{service.description}</p>
            )}
            <div className="field-count">
              {service.fields_count || service.fields?.length || 0} champs requis
            </div>
            <Link 
              to={`/client/services/${service.id}/request`} 
              className="btn-primary"
            >
              Faire une demande
            </Link>
          </div>
        ))}
      </div>

      {services.length === 0 && !loading && (
        <div className="no-services">
          Aucun service trouvé. Essayez une autre recherche.
        </div>
      )}
    </div>
  );
};

export default ServicesList;
