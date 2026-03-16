"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { Tooltip } from "@/components/Tooltip";
import {
    COUNTRY_OPTIONS,
    DEFAULT_COUNTRY_CODE,
    getCountryFlagUrl,
    sanitizePhoneNationalNumberInput,
} from "@/i18n/countries";

type SupplierPhoneFieldProps = {
    countryCode: string;
    number: string;
    onCountryCodeChange: (next: string) => void;
    onNumberChange: (next: string) => void;
};

type PurchaseOrderSectionHeaderProps = {
    title: string;
    description: string;
    action?: ReactNode;
    showTooltip?: boolean;
};

export function SupplierPhoneField({ countryCode, number, onCountryCodeChange, onNumberChange }: SupplierPhoneFieldProps) {
    const normalizedCountryCode = COUNTRY_OPTIONS.some((entry) => entry.code === countryCode) ? countryCode : DEFAULT_COUNTRY_CODE;
    const flagUrl = getCountryFlagUrl(normalizedCountryCode);

    return (
        <div className="form__inputPhoneNR__H5k8q0">
            <div className="form__inputPhoneNRFlag__H5k8q0">
                <select
                    className="form__inputPhoneNR__select__H5k8q0"
                    value={normalizedCountryCode}
                    onChange={(event) => onCountryCodeChange(event.target.value)}
                >
                    {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                            {option.name}
                        </option>
                    ))}
                </select>
                <span className="form__inputPhoneNR__img--wrapper__H5k8q0" aria-hidden="true">
                    <Image
                        className="form__inputPhoneNR__img__H5k8q0"
                        src={flagUrl}
                        alt=""
                        width={24}
                        height={16}
                        loading="lazy"
                    />
                </span>
            </div>
            <input
                className="form__inputPhoneNRNumber__H5k8q0"
                value={number}
                onChange={(event) => onNumberChange(sanitizePhoneNationalNumberInput(event.target.value))}
                placeholder="12 34 56 78"
            />
        </div>
    );
}

export function PurchaseOrderSectionHeader({ title, description, action, showTooltip = true }: PurchaseOrderSectionHeaderProps) {
    return (
        <div className="portalCategoryCreateSectionHeader__H8m2Q4 ui-card-heading-row">
            <h3 className="portalCategoryCreateSectionTitle__B2m8Q7 ui-card-heading">
                {showTooltip ? (
                    <Tooltip title={title} description={description}>
                        <button
                            type="button"
                            className="portalCategoryCreateSectionTitleHint__A2m8Q4 ui-card-heading-hint"
                            aria-label={`Show details for ${title}`}
                        >
                            {title}
                        </button>
                    </Tooltip>
                ) : (
                    <span className="portalCategoryCreateSectionTitleText__M7m2Q4 ui-card-heading-text">{title}</span>
                )}
            </h3>
            {action ? <div className="portalCategoryCreateSectionAction__N8m2Q6 ui-card-heading-action">{action}</div> : null}
        </div>
    );
}
