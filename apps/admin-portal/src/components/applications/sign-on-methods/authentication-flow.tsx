/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

import { AlertLevels } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { Heading, Hint, LabeledCard, LinkButton, PrimaryButton } from "@wso2is/react-components";
import _ from "lodash";
import React, { FunctionComponent, useEffect, useState } from "react";
import { DragDropContext, Droppable, DroppableProvided, DropResult } from "react-beautiful-dnd";
import { useDispatch } from "react-redux";
import { Checkbox, Divider, Grid, Icon } from "semantic-ui-react";
import { getIdentityProviderDetail, getIdentityProviderList, updateAuthenticationSequence } from "../../../api";
import {
    AuthenticationSequenceType,
    AuthenticationStepInterface,
    AuthenticatorInterface,
    IdentityProviderListItemInterface,
    IdentityProviderListResponseInterface,
    IdentityProviderResponseInterface,
    IdentityProviderTypes,
    IDPNameInterface
} from "../../../models";
import {
    AuthenticatorListItemInterface,
    AuthenticatorTypes,
    selectedFederatedAuthenticators,
    selectedLocalAuthenticators
} from "../meta";
import { Authenticators } from "./authenticators";

/**
 * Proptypes for the applications settings component.
 */
interface AuthenticationFlowPropsInterface {
    appId: string;
    authenticationSequence: any;
    isLoading?: boolean;
}

/**
 * Droppable id for the authentication step.
 * @constant
 * @type {string}
 * @default
 */
const AUTHENTICATION_STEP_DROPPABLE_ID: string = "authentication-step-";

/**
 * Droppable id for the local authenticators section.
 * @constant
 * @type {string}
 * @default
 */
const LOCAL_AUTHENTICATORS_DROPPABLE_ID: string = "local-authenticators";

/**
 * Droppable id for the second factor authenticators section.
 * @constant
 * @type {string}
 * @default
 */
const SECOND_FACTOR_AUTHENTICATORS_DROPPABLE_ID: string = "second-factor-authenticators";

/**
 * Droppable id for the social authenticators section.
 * @constant
 * @type {string}
 * @default
 */
const SOCIAL_AUTHENTICATORS_DROPPABLE_ID: string = "social-authenticators";

/**
 * Configure the authentication flow of an application.
 *
 * @param {AuthenticationFlowPropsInterface} props - Props injected to the component.
 * @return {JSX.Element}
 */
export const AuthenticationFlow: FunctionComponent<AuthenticationFlowPropsInterface> = (
    props: AuthenticationFlowPropsInterface
): JSX.Element => {

    const {
        appId,
        authenticationSequence
    } = props;

    const dispatch = useDispatch();

    const [ federatedAuthenticators, setFederatedAuthenticators ] = useState<AuthenticatorListItemInterface[]>([]);
    const [ localAuthenticators, setLocalAuthenticators ] = useState<AuthenticatorListItemInterface[]>([]);
    const [ authenticationSteps, setAuthenticationSteps ] = useState<AuthenticationStepInterface[]>([]);
    const [ subjectStepId, setSubjectStepId ] = useState<number>(undefined);
    const [ attributeStepId, setAttributeStepId ] = useState<number>(undefined);

    /**
     * Loads federated authenticators and local authenticators
     * on component load.
     */
    useEffect(() => {
        loadFederatedAuthenticators();
        loadLocalAuthenticators();
    }, []);

    /**
     * If the `authenticationSequence` prop is available, sets the authentication steps,
     * subject step id, and attribute step id.
     */
    useEffect(() => {
        if (!authenticationSequence) {
            return;
        }

        setAuthenticationSteps(authenticationSequence?.steps);
        setSubjectStepId(authenticationSequence?.subjectStepId);
        setAttributeStepId(authenticationSequence?.attributeStepId);
    }, [ authenticationSequence ]);

    /**
     * Updates the federatedIDPNameList with available IDPs.
     * @return {Promise<any>}
     */
    const updateFederateIDPNameList = (): Promise<any> => {
        return getIdentityProviderList()
            .then((response: IdentityProviderListResponseInterface) => {
                return Promise.all(
                    response?.identityProviders
                    && response.identityProviders instanceof Array
                    && response.identityProviders.length > 0
                    && response.identityProviders.map((item: IdentityProviderListItemInterface) => {
                        if (item.isEnabled) {
                            return updateFederatedIDPNameListItem(item.id);
                        }
                    })
                );
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Retrieval Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while retrieving the IPD list",
                    level: AlertLevels.ERROR,
                    message: "Retrieval Error"
                }));
            });
    };

    /**
     * Add Federated IDP name and ID in to the state.
     * @param {string} id - Identity Provider ID
     * @return {Promise<any>}
     */
    const updateFederatedIDPNameListItem = (id: string): Promise<any> => {
        return getIdentityProviderDetail(id)
            .then((response: IdentityProviderResponseInterface) => {
                const iDPNamePair: IDPNameInterface = {
                    authenticatorId: response?.federatedAuthenticators?.defaultAuthenticatorId,
                    idp: response.name,
                    image: response.image
                };
                if (typeof iDPNamePair.image === "undefined") {
                    delete iDPNamePair.image;
                }
                return Promise.resolve(iDPNamePair);
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Update Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while updating the IPD name",
                    level: AlertLevels.ERROR,
                    message: "Update Error"
                }));
            });
    };

    /**
     *  Merge the IDP name list and meta details to populate the final federated List.
     */
    const loadFederatedAuthenticators = () => {
        updateFederateIDPNameList()
            .then((response) => {

                const selectedFederatedList = [ ...selectedFederatedAuthenticators ];
                const newIDPNameList: IDPNameInterface[] = [ ...response ];

                const finalList = _(selectedFederatedList)
                    .concat(newIDPNameList)
                    .groupBy("authenticatorId")
                    .map(_.spread(_.merge))
                    .value();

                // Updates the federated authenticator List.
                setFederatedAuthenticators(finalList.filter((item) => item.authenticatorId !== undefined));
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Retrieval Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while retrieving the federated authenticators.",
                    level: AlertLevels.ERROR,
                    message: "Retrieval Error"
                }));
            });
    };

    /**
     * Load local authenticator list.
     */
    const loadLocalAuthenticators = () => {
        setLocalAuthenticators([ ...selectedLocalAuthenticators ]);
    };
    /**
     * Handles the authenticator drag and drop event.
     * @param result
     */
    const handleAuthenticatorDrag = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        let idpType: IdentityProviderTypes = null;

        if (result.draggableId && result.destination?.droppableId?.includes(AUTHENTICATION_STEP_DROPPABLE_ID)) {
            if (result.source?.droppableId) {
                if (result.source.droppableId.includes(LOCAL_AUTHENTICATORS_DROPPABLE_ID)) {
                    idpType = IdentityProviderTypes.LOCAL;
                } else if (result.source.droppableId.includes(SECOND_FACTOR_AUTHENTICATORS_DROPPABLE_ID)) {
                    idpType = IdentityProviderTypes.FEDERATED;
                }
            }
        }

        if (!idpType) {
            return;
        }

        // Remark: result.destination.index was giving unexpected values. Therefore as a workaround, index will be
        // extracted from the draggableId. Since the droppable id is in the form of `authentication-step-0`
        // 0 can be extracted by splitting the string.
        const destinationIndex: number = parseInt(
            result.destination.droppableId.split(AUTHENTICATION_STEP_DROPPABLE_ID).pop(),
            10
        );

        updateAuthenticationStep(destinationIndex, result.draggableId, idpType);
    };

    /**
     * Updates the authentication step based on the newly added authenticators.
     *
     * @param {number} stepNo - Step number.
     * @param {string} authenticatorId - Id of the authenticator.
     * @param {IdentityProviderTypes} idpType - Identity provider type.
     */
    const updateAuthenticationStep = (stepNo: number, authenticatorId: string, idpType: IdentityProviderTypes) => {
        let authenticators: AuthenticatorListItemInterface[] = [];

        if (idpType === IdentityProviderTypes.LOCAL) {
            authenticators = [ ...localAuthenticators ];
        } else if (idpType === IdentityProviderTypes.FEDERATED) {
            authenticators = [ ...federatedAuthenticators ];
        }

        const authenticator: AuthenticatorListItemInterface = authenticators
            .find((item) => item.authenticator === authenticatorId);

        if (!authenticator) {
            return;
        }

        const steps: AuthenticationStepInterface[] = [ ...authenticationSteps ];

        const isValid: boolean = validateStepAddition(authenticator, steps[stepNo].options);

        if (!isValid) {
            return;
        }

        steps[ stepNo ].options.push({ authenticator: authenticator.authenticator, idp: authenticator.idp });

        setAuthenticationSteps(steps);
    };

    const validateStepAddition = (authenticator: AuthenticatorListItemInterface,
                                  options: AuthenticatorInterface[]): boolean => {

        if (options.find((option) => option.authenticator === authenticator.authenticator)) {
            dispatch(addAlert({
                description: "The same authenticator is not allowed in the same step.",
                level: AlertLevels.WARNING,
                message: "Not allowed"
            }));

            return false;
        }

        return true;
    };

    /**
     * Resolves the authenticator step option.
     *
     * @param {AuthenticatorInterface} option - Authenticator step option.
     * @return {JSX.Element} A resolved labeled card.
     */
    const resolveStepOption = (option: AuthenticatorInterface): JSX.Element => {
        const authenticators: AuthenticatorListItemInterface[] = option.idp === IdentityProviderTypes.LOCAL
            ? [ ...localAuthenticators ]
            : [ ...federatedAuthenticators ];

        if (authenticators && authenticators instanceof Array && authenticators.length > 0) {

            const authenticator = authenticators.find((item) => item.authenticator === option.authenticator);

            if (!authenticator) {
                return null;
            }

            return (
                <LabeledCard
                    image={ authenticator.image }
                    label={ authenticator.displayName }
                    bottomMargin={ false }
                />
            );
        }
    };

    /**
     * Handles the addition of new authentication step.
     */
    const handleAuthenticationStepAdd = () => {
        const steps = [ ...authenticationSteps ];

        steps.push({
            id: steps.length + 1,
            options: []
        });

        setAuthenticationSteps(steps);
    };

    /**
     * Handles the subject identifier checkbox onchange event.
     *
     * @param {number} id - Step index.
     */
    const onSubjectCheckboxChange = (id: number) => {
        setSubjectStepId(id);
    };

    /**
     * Handles the attribute identifier checkbox onchange event.
     *
     * @param {string} id - Step index.
     */
    const onAttributeCheckboxChange = (id: number) => {
        setAttributeStepId(id);
    };

    /**
     * Handles the authentication flow update action.
     */
    const handleAuthenticationFlowUpdate = () => {
        const requestBody = {
            authenticationSequence: {
                attributeStepId,
                requestPathAuthenticators: [],
                steps: authenticationSteps,
                subjectStepId,
                type: AuthenticationSequenceType.USER_DEFINED
            }
        };

        updateAuthenticationSequence(appId, requestBody)
            .then(() => {
                dispatch(addAlert({
                    description: "Successfully updated the application",
                    level: AlertLevels.SUCCESS,
                    message: "Update successful"
                }));
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Update Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while updating authentication steps of the application",
                    level: AlertLevels.ERROR,
                    message: "Update Error"
                }));
            });
    };

    /**
     * Filters the list of federated authenticators based on the passed in type.
     *
     * @param {AuthenticatorTypes} type - Authenticator type.
     * @return {AuthenticatorListItemInterface[]} A filtered list of authenticators.
     */
    const filterFederatedAuthenticators = (type: AuthenticatorTypes): AuthenticatorListItemInterface[] => {
        let authenticators: AuthenticatorListItemInterface[] = [ ...federatedAuthenticators ];

        if (type === AuthenticatorTypes.SECOND_FACTOR) {
            authenticators = authenticators
                .filter((authenticator) => authenticator.type === AuthenticatorTypes.SECOND_FACTOR);

            return authenticators;
        } else if (type === AuthenticatorTypes.SOCIAL) {
            authenticators = authenticators
                .filter((authenticator) => authenticator.type === AuthenticatorTypes.SOCIAL);

            return authenticators;
        }

        return [];
    };

    return (
        <div className="authentication-flow-section">
            <Grid>
                <Grid.Row>
                    <Grid.Column computer={ 16 }>
                        <Heading as="h4">Authentication flow</Heading>
                        <Hint>
                            Create authentication steps by dragging the local/federated authenticators on to the
                            relevant steps.
                        </Hint>
                    </Grid.Column>
                </Grid.Row>

                <DragDropContext onDragEnd={ handleAuthenticatorDrag }>
                    <Grid.Row>
                        <Grid.Column computer={ 16 }>
                            <div className="authenticators-section">
                                <Grid>
                                    <Grid.Row columns={ 2 }>
                                        <Grid.Column mobile={ 12 } tablet={ 12 } computer={ 5 }>
                                            <Heading as="h6">Local authenticators</Heading>
                                            <Authenticators
                                                authenticators={ localAuthenticators }
                                                droppableId={ LOCAL_AUTHENTICATORS_DROPPABLE_ID }
                                            />
                                        </Grid.Column>
                                        <Grid.Column mobile={ 12 } tablet={ 12 } computer={ 5 }>
                                            <Heading as="h6">Second factor authenticators</Heading>
                                            <Authenticators
                                                authenticators={
                                                    filterFederatedAuthenticators(AuthenticatorTypes.SECOND_FACTOR)
                                                }
                                                droppableId={ SECOND_FACTOR_AUTHENTICATORS_DROPPABLE_ID }
                                            />
                                        </Grid.Column>
                                        <Grid.Column mobile={ 12 } tablet={ 12 } computer={ 5 }>
                                            <Heading as="h6">Social authenticators</Heading>
                                            <Authenticators
                                                authenticators={
                                                    filterFederatedAuthenticators(AuthenticatorTypes.SOCIAL)
                                                }
                                                droppableId={ SECOND_FACTOR_AUTHENTICATORS_DROPPABLE_ID }
                                            />
                                        </Grid.Column>
                                    </Grid.Row>
                                </Grid>
                            </div>
                        </Grid.Column>
                    </Grid.Row>

                    <Grid.Row>
                        <Grid.Column computer={ 16 }>
                            <div className="authentication-steps-section">
                                {
                                    authenticationSteps
                                    && authenticationSteps instanceof Array
                                    && authenticationSteps.length > 0
                                        ? authenticationSteps.map((step, index) => (
                                            <Droppable
                                                key={ index }
                                                droppableId={ AUTHENTICATION_STEP_DROPPABLE_ID + index }
                                            >
                                                { (provided: DroppableProvided) => (
                                                    <div
                                                        ref={ provided.innerRef }
                                                        { ...provided.droppableProps }
                                                        className="authentication-step-container"
                                                    >
                                                        <Heading as="h6">Step { step.id }</Heading>
                                                        <div className="authentication-step">
                                                            {
                                                                step.options
                                                                && step.options instanceof Array
                                                                && step.options.length > 0
                                                                    ? step.options
                                                                        .map((option) => resolveStepOption(option))
                                                                    : null
                                                            }
                                                            { provided.placeholder }
                                                        </div>
                                                        <div className="checkboxes">
                                                            <Checkbox
                                                                label="Use subject identifier from this step"
                                                                checked={ subjectStepId === (index + 1) }
                                                                onChange={ () => onSubjectCheckboxChange(index + 1) }
                                                            />
                                                            <Checkbox
                                                                label="Use attributes from this step"
                                                                checked={ attributeStepId === (index + 1) }
                                                                onChange={ () => onAttributeCheckboxChange(index + 1) }
                                                            />
                                                        </div>
                                                    </div>
                                                ) }
                                            </Droppable>
                                        ))
                                        : null
                                }
                                <Divider hidden/>
                                <LinkButton className="add-step-button" onClick={ handleAuthenticationStepAdd }>
                                    <Icon name="plus"/>Add authentication step
                                </LinkButton>
                                <PrimaryButton onClick={ handleAuthenticationFlowUpdate }>Save changes</PrimaryButton>
                            </div>
                        </Grid.Column>
                    </Grid.Row>
                </DragDropContext>
            </Grid>
        </div>
    );
};
