/**
 * Copyright (c) 2022, WSO2 Inc. (http://www.wso2.com) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AlertLevels, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { Field, Form } from "@wso2is/form";
import { Heading, LinkButton, PrimaryButton } from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Divider, Form as SemanticForm, Grid, Modal } from "semantic-ui-react";
import { EventPublisher } from "../../core";
import { addOrganization } from "../api";
import { ORGANIZATION_TYPE } from "../constants";
import { AddOrganizationInterface, OrganizationInterface } from "../models";

interface OrganizationAddFormProps {
    name: string;
    domainName?: string;
    description?: string;
}

/**
 * Prop types of the `AddOrganizationModal` component.
 */
interface AddOrganizationModalPropsInterface extends TestableComponentInterface {
    closeWizard: () => void;
    parent?: OrganizationInterface;
    /**
     * Callback to update the organization details.
     */
    onUpdate?: () => void;
}

/**
 * An app creation wizard with only the minimal features.
 *
 * @param {AddOrganizationModalPropsInterface} props Props to be injected into the component.
 */
export const AddOrganizationModal: FunctionComponent<AddOrganizationModalPropsInterface> = (
    props: AddOrganizationModalPropsInterface
): ReactElement => {
    const { closeWizard, parent, onUpdate, [ "data-testid" ]: testId } = props;

    const { t } = useTranslation();

    const dispatch = useDispatch();

    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
    const [ type, setType ] = useState<ORGANIZATION_TYPE>(ORGANIZATION_TYPE.STRUCTURAL);

    const submitForm = useRef<() => void>();

    const eventPublisher: EventPublisher = EventPublisher.getInstance();

    const submitOrganization = (values: OrganizationAddFormProps): void => {
        const organization: AddOrganizationInterface = {
            description: values?.description,
            domain: values?.domainName,
            name: values?.name,
            parentId: parent?.id,
            type: type
        };

        setIsSubmitting(true);

        addOrganization(organization)
            .then(() => {
                eventPublisher.compute;
                closeWizard();
                dispatch(
                    addAlert({
                        description: t("adminPortal:components.applications.notifications.add.description"),
                        level: AlertLevels.SUCCESS,
                        message: t("adminPortal:components.applications.notifications.add.message")
                    })
                );
                if (onUpdate) {
                    onUpdate();
                }
            })
            .catch((error) => {
                dispatch(
                    addAlert({
                        description: t("adminPortal:components.applications.notifications.add.description"),
                        level: AlertLevels.ERROR,
                        message: t("adminPortal:components.applications.notifications.add.message")
                    })
                );
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    const validate = (values: OrganizationAddFormProps): Partial<OrganizationAddFormProps> => {
        const error: Partial<OrganizationAddFormProps> = {};

        if (!values?.name) {
            error.name ="Organization name is required";
        }

        if (!values?.domainName && type === ORGANIZATION_TYPE.TENANT) {
            error.domainName = "Domain name is required";
        }

        return error;
    };

    /**
     * Close the wizard.
     */
    const handleWizardClose = (): void => {
        closeWizard();
    };

    return (
        <>
            <Modal
                open={ true }
                className="wizard application-create-wizard"
                size="tiny"
                dimmer="blurring"
                onClose={ handleWizardClose }
                closeOnDimmerClick={ false }
                closeOnEscape
                data-testid={ `${ testId }-modal` }
            >
                <Modal.Header className="wizard-header">
                    Create Organization
                    <Heading as="h6">Create a new organization in { parent?.name ?? "root" }.</Heading>
                </Modal.Header>
                <Modal.Content>
                    <Grid>
                        <Grid.Row columns={ 1 }>
                            <Grid.Column width={ 16 }>
                                <Form
                                    uncontrolledForm={ false }
                                    onSubmit={ submitOrganization }
                                    validate={ validate }
                                    triggerSubmit={ (submit) => submitForm.current = submit }
                                >
                                    <Field.Input
                                        ariaLabel="Organization Name"
                                        inputType="name"
                                        name="name"
                                        label="Organization Name"
                                        required={ true }
                                        placeholder="Enter the organization name"
                                        maxLength={ 32 }
                                        minLength={ 3 }
                                        data-testid={ `${ testId }-organization-name-input` }
                                        width={ 16 }
                                    />
                                    <Field.Input
                                        ariaLabel="Description"
                                        inputType="description"
                                        name="description"
                                        label="Description"
                                        required={ false }
                                        placeholder="Enter description"
                                        maxLength={ 32 }
                                        minLength={ 3 }
                                        data-testid={ `${ testId }-description-input` }
                                        width={ 16 }
                                    />
                                    <Field.Input
                                        ariaLabel="Domain Name"
                                        inputType="default"
                                        name="domainName"
                                        label="Domain Name"
                                        placeholder="Enter domain name"
                                        required={ type === ORGANIZATION_TYPE.TENANT }
                                        maxLength={ 32 }
                                        minLength={ 3 }
                                        data-testid={ `${ testId }-domain-name-input` }
                                        width={ 16 }
                                    />
                                </Form>
                                <Divider hidden/>
                                   <SemanticForm>
                                    <SemanticForm.Group grouped>
                                        <label>Type</label>
                                        <SemanticForm.Radio
                                            label="Structural"
                                            value={ ORGANIZATION_TYPE.STRUCTURAL }
                                            checked={ type === ORGANIZATION_TYPE.STRUCTURAL }
                                            onChange={ () => setType(ORGANIZATION_TYPE.STRUCTURAL) }
                                        />
                                        <SemanticForm.Radio
                                            label="Tenant"
                                            value={ ORGANIZATION_TYPE.TENANT }
                                            checked={ type === ORGANIZATION_TYPE.TENANT }
                                            onChange={ () => setType(ORGANIZATION_TYPE.TENANT) }
                                        />
                                    </SemanticForm.Group>
                                </SemanticForm>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Modal.Content>
                <Modal.Actions>
                    <Grid>
                        <Grid.Row column={ 1 }>
                            <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                                <LinkButton floated="left" onClick={ handleWizardClose }>
                                    { t("common:cancel") }
                                </LinkButton>
                            </Grid.Column>
                            <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                                <PrimaryButton
                                    floated="right"
                                    onClick={ () => {
                                        submitForm?.current && submitForm?.current();
                                    } }
                                    data-testid={ `${ testId }-next-button` }
                                    loading={ isSubmitting }
                                    disabled={ isSubmitting }
                                >
                                    { t("common:register") }
                                </PrimaryButton>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Modal.Actions>
            </Modal>
        </>
    );
};

/**
 * Default props for the application creation wizard.
 */
AddOrganizationModal.defaultProps = {
    "data-testid": "organization-create-wizard"
};
