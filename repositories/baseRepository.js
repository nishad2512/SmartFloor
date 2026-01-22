

export const create = (Model, data) => {
  return Model.create(data);
};

export const findOne = (Model, filter = {}, projection = "") => {
  return Model.findOne(filter, projection);
};

export const findById = (Model, id, projection = "") => {
  return Model.findById(id, projection);
};

export const updateById = (Model, id, data, options = { new: true }) => {
  return Model.findByIdAndUpdate(id, data, options);
};

export const deleteById = (Model, id) => {
  return Model.findByIdAndDelete(id);
};

export const count = (Model, filter = {}) => {
  return Model.countDocuments(filter);
};


export const findWithQuery = async (
  Model,
  queryParams = {},
  baseFilter = {},
  searchFields = []
) => {
  let filter = { ...baseFilter };

  /* ---------- SEARCH ---------- */
  if (queryParams.search && searchFields.length) {
    filter.$or = searchFields.map((field) => ({
      [field]: { $regex: queryParams.search, $options: "i" },
    }));
  }

  /* ---------- FILTER ---------- */
  const excludedFields = ["page", "limit", "sort", "search"];

  Object.keys(queryParams).forEach((key) => {
    if (!excludedFields.includes(key)) {
      filter[key] = queryParams[key];
    }
  });

  /* ---------- SORT ---------- */
  let sort = { createdAt: -1 };

  if (queryParams.sort) {
    sort = {};
    queryParams.sort.split(",").forEach((field) => {
      if (field.startsWith("-")) {
        sort[field.substring(1)] = -1;
      } else {
        sort[field] = 1;
      }
    });
  }

  /* ---------- PAGINATION ---------- */
  const page = Number(queryParams.page) || 1;
  const limit = Number(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  /* ---------- DATA ---------- */
  const data = await Model.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  /* ---------- COUNT ---------- */
  const total = await Model.countDocuments(filter);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
