import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithContexts } from '../../../../testUtils/enzymeHelpers';
import { sleep } from '../../../../testUtils/testUtils';
import JobDetail from './JobDetail';
import { JobsAPI, ProjectUpdatesAPI } from '../../../api';
import mockJobData from '../shared/data.job.json';

jest.mock('../../../api');

describe('<JobDetail />', () => {
  let wrapper;
  afterEach(() => {
    wrapper.unmount();
  });

  test('should display details', () => {
    function assertDetail(label, value) {
      expect(wrapper.find(`Detail[label="${label}"] dt`).text()).toBe(label);
      expect(wrapper.find(`Detail[label="${label}"] dd`).text()).toBe(value);
    }

    wrapper = mountWithContexts(
      <JobDetail
        job={{
          ...mockJobData,
          summary_fields: {
            ...mockJobData.summary_fields,
            credential: {
              id: 2,
              name: 'Machine cred',
              description: '',
              kind: 'ssh',
              cloud: false,
              kubernetes: false,
              credential_type_id: 1,
            },
            source_workflow_job: {
              id: 1234,
              name: 'Test Source Workflow',
            },
          },
        }}
      />
    );

    // StatusIcon adds visibly hidden accessibility text " successful "
    assertDetail('Status', ' successful Successful');
    assertDetail('Started', '8/8/2019, 7:24:18 PM');
    assertDetail('Finished', '8/8/2019, 7:24:50 PM');
    assertDetail('Job Template', mockJobData.summary_fields.job_template.name);
    assertDetail('Source Workflow Job', `1234 - Test Source Workflow`);
    assertDetail('Job Type', 'Playbook Run');
    assertDetail('Launched By', mockJobData.summary_fields.created_by.username);
    assertDetail('Inventory', mockJobData.summary_fields.inventory.name);
    assertDetail(
      'Project',
      ` successful ${mockJobData.summary_fields.project.name}`
    );
    assertDetail('Revision', mockJobData.scm_revision);
    assertDetail('Playbook', mockJobData.playbook);
    assertDetail('Verbosity', '0 (Normal)');
    assertDetail('Execution Node', mockJobData.execution_node);
    assertDetail(
      'Instance Group',
      mockJobData.summary_fields.instance_group.name
    );
    assertDetail('Job Slice', '0/1');
    assertDetail('Credentials', 'SSH: Demo Credential');
    assertDetail('Machine Credential', 'SSH: Machine cred');

    const executionEnvironment = wrapper.find('ExecutionEnvironmentDetail');
    expect(executionEnvironment).toHaveLength(1);
    expect(executionEnvironment.find('dt').text()).toEqual(
      'Execution Environment'
    );
    expect(executionEnvironment.find('dd').text()).toEqual(
      mockJobData.summary_fields.execution_environment.name
    );

    const credentialChip = wrapper.find(
      `Detail[label="Credentials"] CredentialChip`
    );
    expect(credentialChip.prop('credential')).toEqual(
      mockJobData.summary_fields.credentials[0]
    );

    expect(
      wrapper
        .find('Detail[label="Job Tags"]')
        .containsAnyMatchingElements([<span>a</span>, <span>b</span>])
    ).toEqual(true);

    expect(
      wrapper
        .find('Detail[label="Skip Tags"]')
        .containsAnyMatchingElements([<span>c</span>, <span>d</span>])
    ).toEqual(true);

    const statusDetail = wrapper.find('Detail[label="Status"]');
    expect(statusDetail.find('StatusIcon SuccessfulTop')).toHaveLength(1);
    expect(statusDetail.find('StatusIcon SuccessfulBottom')).toHaveLength(1);

    const projectStatusDetail = wrapper.find('Detail[label="Project"]');
    expect(projectStatusDetail.find('StatusIcon SuccessfulTop')).toHaveLength(
      1
    );
    expect(
      projectStatusDetail.find('StatusIcon SuccessfulBottom')
    ).toHaveLength(1);
  });

  test('should properly delete job', async () => {
    wrapper = mountWithContexts(<JobDetail job={mockJobData} />);
    wrapper.find('button[aria-label="Delete"]').simulate('click');
    await sleep(1);
    wrapper.update();
    const modal = wrapper.find('Modal');
    expect(modal.length).toBe(1);
    modal.find('button[aria-label="Delete"]').simulate('click');
    expect(JobsAPI.destroy).toHaveBeenCalledTimes(1);
  });

  test('should display error modal when a job does not delete properly', async () => {
    ProjectUpdatesAPI.destroy.mockRejectedValue(
      new Error({
        response: {
          config: {
            method: 'delete',
            url: '/api/v2/project_updates/1',
          },
          data: 'An error occurred',
          status: 404,
        },
      })
    );
    wrapper = mountWithContexts(<JobDetail job={mockJobData} />);
    wrapper.find('button[aria-label="Delete"]').simulate('click');
    const modal = wrapper.find('Modal');
    expect(modal.length).toBe(1);
    await act(async () => {
      modal.find('button[aria-label="Delete"]').simulate('click');
    });
    wrapper.update();

    const errorModal = wrapper.find('ErrorDetail');
    expect(errorModal.length).toBe(1);
  });

  test('DELETED is shown for required Job resources that have been deleted', () => {
    wrapper = mountWithContexts(
      <JobDetail
        job={{
          ...mockJobData,
          summary_fields: {
            ...mockJobData.summary_fields,
            inventory: null,
            project: null,
          },
        }}
      />
    );
    const detail = wrapper.find('JobDetail');
    async function assertMissingDetail(label) {
      expect(detail.length).toBe(1);
      await sleep(0);
      expect(detail.find(`Detail[label="${label}"] dt`).text()).toBe(label);
      expect(detail.find(`Detail[label="${label}"] dd`).text()).toBe('DELETED');
    }
    assertMissingDetail('Project');
    assertMissingDetail('Inventory');
  });
});
