export type FindUserParams = {
  userIds?: string[];
  phones?: string[];
  login?: string;
  take?: number;
  skip?: number;
};

export type CheckExistUserParams = {
  phone: string;
  login: string;
};
