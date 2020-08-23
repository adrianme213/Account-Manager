import React, {FC, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useHistory} from 'react-router-dom';

import Modal from '@renderer/components/Modal';
import {getManagedValidators} from '@renderer/selectors';
import {setManagedValidator} from '@renderer/store/app';
import {AppDispatch, ProtocolType} from '@renderer/types';
import {formatAddress, formatAddressFromNode, formatPathFromNode} from '@renderer/utils/address';
import yup from '@renderer/utils/yup';

import AddValidatorModalFields from './AddValidatorModalFields';
import './AddValidatorModal.scss';

const initialValues = {
  form: '',
  ipAddress: '',
  nickname: '',
  port: '',
  protocol: 'http' as ProtocolType,
};

type FormValues = typeof initialValues;

const genericIpAddressRegex = /([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(\d{1,3}\.){3}\d{1,3}/;

interface ComponentProps {
  close(): void;
}

const AddValidatorModal: FC<ComponentProps> = ({close}) => {
  const dispatch = useDispatch<AppDispatch>();
  const history = useHistory();
  const managedValidators = useSelector(getManagedValidators);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const managedValidatorAddresses = useMemo(
    () => Object.values(managedValidators).map((validator) => formatAddressFromNode(validator)),
    [managedValidators],
  );

  const managedValidatorNicknames = useMemo(
    () =>
      Object.values(managedValidators)
        .filter(({nickname}) => !!nickname)
        .map(({nickname}) => nickname),
    [managedValidators],
  );

  const handleSubmit = ({ipAddress, nickname, port, protocol}: FormValues): void => {
    // TODO: Must check the validity of the address, and get signing key
    setSubmitting(true);
    const formattedData = {
      ip_address: ipAddress,
      nickname,
      port: port ? parseInt(port, 10) : null,
      protocol,
      signing_key: '',
    };

    dispatch(setManagedValidator(formattedData));
    setSubmitting(false);
    history.push(`/validator/${formatPathFromNode(formattedData)}`);
    close();
  };

  const validationSchema = useMemo(() => {
    return yup.object().shape({
      form: yup.string().when(['ipAddress', 'port', 'protocol'], {
        is: (ipAddress, port, protocol) => managedValidatorAddresses.includes(formatAddress(ipAddress, port, protocol)),
        otherwise: yup.string(),
        then: yup.string().required('Address is already a managed bank'),
      }),
      ipAddress: yup
        .string()
        .required('This field is required')
        .matches(genericIpAddressRegex, {excludeEmptyString: true, message: 'IPv4 or IPv6 addresses only'}),
      nickname: yup.string().notOneOf(managedValidatorNicknames, 'That nickname is already taken'),
      port: yup.number().integer(),
      protocol: yup.string().required(),
    });
  }, [managedValidatorAddresses, managedValidatorNicknames]);

  return (
    <Modal
      className="AddValidatorModal"
      close={close}
      header="Add Validator"
      ignoreDirty
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitButton="Add"
      submitting={submitting}
      validationSchema={validationSchema}
    >
      <AddValidatorModalFields />
    </Modal>
  );
};

export default AddValidatorModal;
