"""Moai-link → force-directed graph transform (for the moai-link view)."""

from pydantic import BaseModel

from weft_backend.dao import Dao


class GraphNode(BaseModel):
    id: str
    name: str


class GraphLink(BaseModel):
    source: str
    target: str
    label: str
    relations: str
    bidirectional: bool


class LinkGraph(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


def build_link_graph(dao: Dao) -> LinkGraph:
    """Pre-transform ``moai_link`` into ``{nodes, links}`` for the force-graph."""

    links: list[GraphLink] = []
    nodes: dict[str, GraphNode] = {}
    for label, link_list in dao.moai_link.items():
        for link in link_list:
            a, b = link.moais
            nodes[a.name] = GraphNode(id=a.name, name=a.name)
            nodes[b.name] = GraphNode(id=b.name, name=b.name)
            links.append(
                GraphLink(
                    source=a.name,
                    target=b.name,
                    label=label,
                    relations=link.relations,
                    bidirectional=link.bidirectional,
                )
            )
    return LinkGraph(nodes=list(nodes.values()), links=links)
