import { useState } from "react";
import type { FormEvent } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    propertyType: "Residential",
    squareFootage: "",
    unitCount: "",
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceAddress: "",
    city: "",
    state: "",
    zip: "",
    serviceFrequency: "Monthly",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: Connect to FieldRoutes via webhook
    console.log("Form submitted:", formData);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="form-success">
        <h3>Thank you!</h3>
        <p>Your request has been submitted. You'll receive a confirmation email shortly.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <h3>Start Service</h3>
      <p className="form-description">
        This form creates a customer lead. You'll receive a confirmation email after submission.
      </p>

      <div className="form-group">
        <label>Residential or Commercial?</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="propertyType"
              value="Residential"
              checked={formData.propertyType === "Residential"}
              onChange={handleChange}
            />
            Residential
          </label>
          <label>
            <input
              type="radio"
              name="propertyType"
              value="Commercial"
              checked={formData.propertyType === "Commercial"}
              onChange={handleChange}
            />
            Commercial
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="squareFootage">Square Footage</label>
          <input
            type="number"
            id="squareFootage"
            name="squareFootage"
            value={formData.squareFootage}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="unitCount">Unit Count</label>
          <input
            type="number"
            id="unitCount"
            name="unitCount"
            value={formData.unitCount}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="companyName">Company Name</label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="serviceAddress">Service Address *</label>
        <input
          type="text"
          id="serviceAddress"
          name="serviceAddress"
          value={formData.serviceAddress}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State *</label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            maxLength={2}
            placeholder="MA"
          />
        </div>
        <div className="form-group">
          <label htmlFor="zip">Zip *</label>
          <input
            type="text"
            id="zip"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="serviceFrequency">Service Frequency</label>
        <select
          id="serviceFrequency"
          name="serviceFrequency"
          value={formData.serviceFrequency}
          onChange={handleChange}
        >
          <option value="Monthly">Monthly</option>
          <option value="Every 2 Months">Every 2 Months</option>
          <option value="Every 3 Months">Every 3 Months</option>
        </select>
      </div>

      <button type="submit" className="btn btn-primary btn-full">Submit</button>
    </form>
  );
}
