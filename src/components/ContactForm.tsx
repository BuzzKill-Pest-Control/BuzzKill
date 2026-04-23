import { useState } from "react";
import type { FormEvent } from "react";
import Icon from "./Icon";

type PropertyType = "Residential" | "Commercial";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    propertyType: "Residential" as PropertyType,
    squareFootage: "",
    unitCount: "",
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceAddress: "",
    city: "",
    state: "MA",
    zip: "",
    serviceFrequency: "Monthly",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function setPropertyType(value: PropertyType) {
    setFormData({ ...formData, propertyType: value });
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
        <div className="check">
          <Icon name="check" className="" />
        </div>
        <h3>Thank you.</h3>
        <p>
          Your request has been submitted. You'll receive a confirmation email
          shortly.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h3>Start service</h3>
      <p className="fdesc">
        This form creates a customer lead. We'll follow up within one business
        day.
      </p>

      <div className="fg">
        <label>Residential or commercial?</label>
        <div className="radio-pills" role="radiogroup" aria-label="Property type">
          <label className={formData.propertyType === "Residential" ? "on" : ""}>
            <input
              type="radio"
              name="propertyType"
              value="Residential"
              checked={formData.propertyType === "Residential"}
              onChange={() => setPropertyType("Residential")}
            />
            <span className="bullet" />
            Residential
          </label>
          <label className={formData.propertyType === "Commercial" ? "on" : ""}>
            <input
              type="radio"
              name="propertyType"
              value="Commercial"
              checked={formData.propertyType === "Commercial"}
              onChange={() => setPropertyType("Commercial")}
            />
            <span className="bullet" />
            Commercial
          </label>
        </div>
      </div>

      <div className="frow">
        <div className="fg">
          <label htmlFor="squareFootage">Square footage</label>
          <input
            type="number"
            id="squareFootage"
            name="squareFootage"
            value={formData.squareFootage}
            onChange={handleChange}
          />
        </div>
        <div className="fg">
          <label htmlFor="unitCount">Unit count</label>
          <input
            type="number"
            id="unitCount"
            name="unitCount"
            value={formData.unitCount}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="fg">
        <label htmlFor="companyName">Company name</label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
        />
      </div>

      <div className="frow">
        <div className="fg">
          <label htmlFor="firstName">First name *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="fg">
          <label htmlFor="lastName">Last name *</label>
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

      <div className="frow">
        <div className="fg">
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
        <div className="fg">
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

      <div className="fg">
        <label htmlFor="serviceAddress">Service address *</label>
        <input
          type="text"
          id="serviceAddress"
          name="serviceAddress"
          value={formData.serviceAddress}
          onChange={handleChange}
          required
        />
      </div>

      <div className="frow frow-3">
        <div className="fg">
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
        <div className="fg">
          <label htmlFor="state">State *</label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={(e) =>
              setFormData({
                ...formData,
                state: e.target.value.toUpperCase().slice(0, 2),
              })
            }
            required
            maxLength={2}
            placeholder="MA"
          />
        </div>
        <div className="fg">
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

      <div className="fg">
        <label htmlFor="serviceFrequency">Service frequency</label>
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

      <button type="submit" className="btn btn-primary btn-full">
        Submit request
      </button>
    </form>
  );
}
