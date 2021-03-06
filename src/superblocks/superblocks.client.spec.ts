// Copyright 2019 Superblocks AB
//
// This file is part of Superblocks.
//
// Superblocks is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// Superblocks is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Superblocks.  If not, see <http://www.gnu.org/licenses/>.

import 'reflect-metadata';
import * as sinon from 'ts-sinon';
import * as assert from 'assert';
import fetchMock, { MockResponse } from 'fetch-mock';
import { ISuperblocksClient, ISuperblocksUtils } from '../ioc/interfaces';
import { ITransactionModel, ITransactionParamsModel, IDeploymentModel } from './models';
import { SinonSandbox } from 'sinon';
import { SuperblocksClient } from './superblocks.client';

describe('SuperblocksClient:', () => {
    let superblocksClient: ISuperblocksClient;
    let sandbox: SinonSandbox;
    let mockUtils: ISuperblocksUtils;

    beforeEach(() => {
        // Remove console logs to make the test results cleaner
        sandbox = sinon.default.createSandbox();
        sandbox.stub(console, 'log');

        mockUtils = sinon.stubInterface<ISuperblocksUtils>({ getApiBaseUrl: 'https://some-url'});
    });

    afterEach(() => {
        sandbox.restore();
    });

    const txParams = <ITransactionParamsModel> {
        ciJobId: '2',
        networkId: '4',
        from: '0x5678900000000000000000000000000000004321',
        rpcPayload: {
            jsonrpc: 'data',
            id: 0,
            method: 'eth_sendTransaction',
            params: ['parameters']
        },
    };

    const tx = <ITransactionModel> {
        id: '2',
        networkId: '4',
        from: '0x5678900000000000000000000000000000004321',
        rpcPayload: {
            jsonrpc: 'data',
            id: 0,
            method: 'eth_sendTransaction',
            params: ['parameters']
        },
    };

    describe('sendEthTransaction:', () => {
        it('sends Ethereum Transaction', () => {
            const deploymentId = 'dummyId';
            const mockFetch = fetchMock.sandbox().post(`https://some-url/deployments/${deploymentId}/transactions`, <MockResponse>{ status: 201, body: tx });
            superblocksClient = new SuperblocksClient(mockFetch, mockUtils);

            let txResponse: ITransactionModel;
            assert.doesNotThrow(async () => {
                txResponse = await superblocksClient.sendEthTransaction(deploymentId, 'dummyToken', txParams);
                assert.deepStrictEqual(txResponse, tx);
            });
        });

        it('fails to send request due to API error response', async () => {
            const deploymentId = 'dummyId';
            const mockFetch = fetchMock.sandbox().post(`https://some-url/deployments/${deploymentId}/transactions`, <MockResponse>{ status: 400, body: { message: 'This is an error' }});
            superblocksClient = new SuperblocksClient(mockFetch, mockUtils);

            assert.rejects(superblocksClient.sendEthTransaction(deploymentId, 'dummyToken', txParams));
        });
    });

    describe('createDeployment:', () => {
        it('creates a new Superblocks deployment', () => {
            const projectId = 'projectId01234567890';
            const userToken = 'userToken0987654321';
            const environment = 'environment1234567890';

            const mockFetch = fetchMock.sandbox().post(`https://some-url/deployment-spaces/${projectId}/deployments/`,
                <MockResponse>{
                    status: 201,
                    body: {
                        id: 'id'
                    }
                });

            superblocksClient = new SuperblocksClient(mockFetch, mockUtils);

            let deploymentResponse: IDeploymentModel;
            assert.doesNotThrow(async () => {
                deploymentResponse = await superblocksClient.createDeployment(projectId, userToken, environment);
                assert.deepStrictEqual(deploymentResponse, {
                    id: 'id'
                });
            });
        });

        it('fails to create a deployment due to API error response', async () => {
            const projectId = 'space123';
            const userToken = 'userToken0987654321';
            const environment = 'environment1234567890';

            const mockFetch = fetchMock.sandbox().post(`https://some-url/build-configs/${projectId}/deployments`,
                <MockResponse>{
                    status: 400,
                    body: {
                        message: 'This is an error'
                    }
                });

            superblocksClient = new SuperblocksClient(mockFetch, mockUtils);

            try {
                await superblocksClient.createDeployment(projectId, userToken, environment);
            } catch (e) {
                assert.deepStrictEqual(e.message, '[Superblocks Provider] cannot create a deployment for project space123: {"message":"This is an error"}');
            }
        });
    });
});
